#!/usr/bin/env php
<?php
/**
 * Trackmania Campaign Metadata Fetcher (CLI)
 * (this script is vibe coded with ChatGPT)
 *
 * This script fetches the current official Trackmania campaign metadata
 * from the Nadeo Live Services API and writes a cached JSON file used by
 * the frontend (campaign_info.json).
 *
 * The script is intended to be executed from the command line only and
 * must NOT be exposed via the web server. It is typically run via cron.
 *
 * Behavior:
 * - Reads API credentials from config.php
 * - Calls the Nadeo authentication endpoint to obtain an access token
 * - Fetches the current official campaign data
 * - Writes a normalized JSON file to campaign_info.json
 * - Skips API calls if the cached data is fresh (≤ 48 hours old),
 *   unless the campaign has already ended
 *
 * Cron usage:
 * - The script is designed to be run periodically (e.g. once per hour)
 * - Cron frequency can be higher than the API fetch interval, as the
 *   script performs its own freshness checks before making API requests
 * - Example cron entry:
 *
 *     0 * * * * /usr/bin/php /path/to/repo/tools/fetch_campaign.php
 *
 * Notes:
 * - All paths are resolved relative to the php script directory
 * - Only the generated JSON file is web-accessible; no PHP code or
 *   credentials are exposed
 * 
 * You can symlink the campaign_info.json to your www root, or change
 * the script to put it in the right directory
 * 
 * Uses the following Trackmania 2020 APIs
 * 
 * Dedicated server account for authenticaton
 * Documentation:
 * https://webservices.openplanet.dev/auth/dedi
 * 
 * Credentials dashboard:
 * https://www.trackmania.com/player/dedicated-servers
 * 
 * Get seasonal campaigns (v2)
 * Documentation:
 * https://webservices.openplanet.dev/live/campaigns/campaigns-v2
 */
declare(strict_types=1);

/**
 * Config
 */
$configFile   = __DIR__ . '/config.php';
$outputFile   = __DIR__ . '/campaign_info.json';
$userAgent    = 'NextCampaign / @username / email@example.com';

$authUrl      = 'https://prod.trackmania.core.nadeo.online/v2/authentication/token/basic';
$campaignsUrl = 'https://live-services.trackmania.nadeo.live/api/campaign/official?offset=0&length=1';

$infoFile = $outputFile;
$now = time();
$maxAge = 48 * 60 * 60; // 48 hours

if (file_exists($infoFile)) {
    try {
        $existing = json_decode(
            file_get_contents($infoFile),
            true,
            512,
            JSON_THROW_ON_ERROR
        );

        $fetchedAt = (int) ($existing['fetchedAtTimestamp'] ?? 0);
        $endTimestamp = (int) ($existing['endTimestamp'] ?? 0);

        $isFresh = $fetchedAt > 0 && ($now - $fetchedAt) < $maxAge;
        $isActive = $endTimestamp > 0 && $now <= $endTimestamp;

        // ✅ Exit early if:
        // - fetched less than 48h ago
        // - AND campaign has not ended
        if ($isFresh && $isActive) {
            exit;//("Not updating\n"); // Nothing to do
        }
    } catch (Throwable $e) {
        // Ignore and refetch
    }
}

/**
 * Helper: HTTP request via cURL
 */
function httpRequest(
    string $url,
    string $method = 'GET',
    array $headers = [],
    ?string $body = null
): array {
    $ch = curl_init($url);

    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_HTTPHEADER     => $headers,
    ]);

    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }

    $response = curl_exec($ch);

    if ($response === false) {
        throw new RuntimeException('cURL error: ' . curl_error($ch));
    }

    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($status < 200 || $status >= 300) {
        throw new RuntimeException("HTTP $status: $response");
    }

    return json_decode($response, true, 512, JSON_THROW_ON_ERROR);
}

$configFile = __DIR__ . '/config.php';

if (!file_exists($configFile)) {
    throw new RuntimeException('Missing config.php');
}

$config = require $configFile;

if (empty($config['basicAuthCredentials'])) {
    throw new RuntimeException('basicAuthCredentials missing in config.php');
}

$basicAuth = base64_encode($config['basicAuthCredentials']);
$userAgent = $config['userAgent'] ?? 'NextcCmpaign';

/**
 * Step 1: Get access token
 */
$authResponse = httpRequest(
    $authUrl,
    'POST',
    [
        'Content-Type: application/json',
        "Authorization: Basic {$basicAuth}",
        "User-Agent: {$userAgent}",
    ],
    json_encode(['audience' => 'NadeoLiveServices'], JSON_THROW_ON_ERROR)
);

$accessToken  = $authResponse['accessToken'] ?? null;
$refreshToken = $authResponse['refreshToken'] ?? null;

if (!$accessToken) {
    throw new RuntimeException('accessToken missing in auth response');
}

/**
 * Step 2: Fetch campaigns
 */
$campaignsResponse = httpRequest(
    $campaignsUrl,
    'GET',
    [
        "Authorization: nadeo_v1 t={$accessToken}",
        "User-Agent: {$userAgent}",
    ]
);

//print_r($campaignsResponse);
$campaign = $campaignsResponse['campaignList'][0] ?? null;

if (
    !$campaign ||
    !isset($campaign['startTimestamp'], $campaign['endTimestamp'])
) {
    throw new RuntimeException('Campaign timestamps not found');
}

$startTimestamp = (int) $campaign['startTimestamp'];
$endTimestamp   = (int) $campaign['endTimestamp'];
$output = [
    'currentCampaign' => mb_convert_case($campaign['name'], MB_CASE_TITLE, "UTF-8"),
    'startTimestamp' => $startTimestamp,
    'endTimestamp' => $endTimestamp,
    'startDateUTC' => gmdate('c', $startTimestamp),
    'endDateUTC' => gmdate('c', $endTimestamp),
    'fetchedAtTimestamp' => time(),
    'fetchedAtUTC' => gmdate('c'),
    'nextRequestInSeconds' => (int) ($campaignsResponse['relativeNextRequest'] ?? 0),
];
file_put_contents(
    $outputFile,
    json_encode($output, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR)
);

echo "Saved endTimestamp to {$outputFile}\n";
?>