/* needs the following libraries
 * serverTime, for synchronising local clock to server:
 * https://nextcampaign.m8.no/time.php (.phps for source)
 * Luxon for calculating time diffrence, including months
 * https://moment.github.io/luxon/
 * this code is based on: https://www.sitepoint.com/build-javascript-countdown-timer-no-dependencies/ (I guess there's dependencies now :-D)
 */
// testdates to test the timer, overwrites serverTime
//serverTime = new Date('July 1 2022 17:00:01 UTC+2');
//serverTime = new Date('July 1 2022 16:59:50 UTC+2');
//serverTime = new Date('Sept 4 2022 16:59:50 UTC+1');
//serverTime = new Date('Feb 20 2022 23:59:50 UTC+1');
//serverTime = new Date('Dec 31 2021 23:59:50 UTC+1');
var localTime = Date.now(),
    timeDiff = 0,
    showSeconds = true;

if (typeof serverTime != "undefined")
  timeDiff = serverTime - localTime;
function today() {
  return new Date(Date.now() + timeDiff);
}
const DateTime = luxon.DateTime;
const Duration = luxon.Duration;

// vibe coded, gets campaign info from a json file from a cached Trackmania API call
let cachedCampaign;
async function getCampaignInfo() {
  if (typeof cachedCampaign != "undefined") return cachedCampaign;
  try {
    const response = await fetch('/campaign_info.json', { cache: 'no-store' });
    if (!response.ok) {
      return cachedCampaign = null;
    }
    const data = await response.json();
    const end = Number(data?.endTimestamp ?? 0);
    const now = Math.floor(Date.now() / 1000);
    return cachedCampaign = (end && now <= end) ? data : null;
  }
  catch {
    return cachedCampaign = null;
  }
}

// vibe coded, gets next season based on current season
/**
 * Returns the next seasonal campaign name based on a given season/year string.
 *
 * The input must be in the format "<Season> <Year>", for example "Fall 2025".
 * Seasons are assumed to follow this fixed order:
 *   Winter → Spring → Summer → Fall → Winter
 *
 * When transitioning from Fall to Winter, the year is incremented.
 * For all other season transitions, the year remains the same.
 *
 * Examples:
 *   nextSeason("Fall 2025")   → "Winter 2026"
 *   nextSeason("Winter 2026") → "Spring 2026"
 *   nextSeason("Summer 2026") → "Fall 2026"
 *
 * If the input format is invalid or the season is not recognized,
 * an empty string is returned.
 *
 * @param {string} current - The current season and year (e.g. "Fall 2025").
 * @returns {string} The next season and year, or an empty string on error.
 */
function nextSeason(current) {
    const seasons = ['Winter', 'Spring', 'Summer', 'Fall'];

    const [season, yearStr] = current.split(' ');
    let year = Number(yearStr);

    const index = seasons.indexOf(season);
    if (index === -1 || !year) return '';

    const nextIndex = (index + 1) % seasons.length;

    // Only increment year when wrapping Fall → Winter
    if (season === 'Fall') {
        year += 1;
    }

    return `${seasons[nextIndex]} ${year}`;
}
/**
 * Rounds a time value down to the nearest whole minute.
 *
 * If a numeric timestamp is provided, it is assumed to be in milliseconds
 * and the function returns a number (milliseconds).
 *
 * If a Date object is provided, the function returns a new Date instance
 * representing the same moment rounded down to the nearest minute.
 *
 * Examples:
 *   roundToNearestMinute(1700000123456)
 *     → 1700000100000
 *
 *   roundToNearestMinute(new Date('2026-01-08T12:34:56Z'))
 *     → Date('2026-01-08T12:34:00Z')
 *
 * @param {number|Date} date - A timestamp in milliseconds or a Date object.
 * @returns {number|Date} The rounded-down timestamp or Date.
 */
function roundToNearestMinute(date) {
  const minutes = 1;
  const ms = 1000 * 60 * minutes;
  if (typeof date == "number")
    return (Math.floor(date / ms) * ms);
  return new Date(Math.floor(date.getTime() / ms) * ms);
}

function getTimeRemaining(endtime) {
  var endtimeMilli = new Date(endtime).getTime(),
      todayMilli = today().getTime(),
      diff = DateTime.fromMillis(endtimeMilli).diff(DateTime.fromMillis(todayMilli), ['months', 'days', 'hours', 'minutes', 'seconds']);
  // if 1 or more months or more than 7 days left, round down to nearest minute since seconds aren't shown
  if (diff.months > 0 || diff.days > 7) {
    showSeconds = false;
    diff = DateTime.fromMillis(endtimeMilli).diff(DateTime.fromMillis(roundToNearestMinute(todayMilli)), ['months', 'days', 'hours', 'minutes', 'seconds']);
  }
  var months = diff.months,
      days = diff.days,
      hours = diff.hours,
      minutes = diff.minutes,
      seconds = Math.floor(diff.seconds),
      finish = months == 0 &&
               days == 0 &&
               hours == 0 &&
               minutes == 0 &&
               seconds == 0;
  return {
    finish,
    months,
    days,
    hours,
    minutes,
    seconds
  };
}
// the next 2 functions are vibe coded with ChatGPT
/**
 * Calculates campaign number since Summer 2020
 */
function quartersSinceSummer2020(currentDate) {
    const startDate = DateTime.local(2020, 6, 1); // June 1, 2020
    const startQuarter = startDate.quarter;
    const currentQuarter = currentDate.quarter;

    const yearDifference = currentDate.year - startDate.year;
    const totalQuarters = yearDifference * 4 + (currentQuarter - startQuarter);

    return totalQuarters;
}
/**
 * Converts a number into its English ordinal representation.
 *
 * Examples:
 *   1  → "1st"
 *   2  → "2nd"
 *   3  → "3rd"
 *
 * Handles the special cases for numbers ending in 11, 12, and 13
 * by correctly using the "th" suffix.
 *
 * @param {number} number - The number to convert.
 * @returns {string} The ordinal form of the number (e.g. "3rd", "21st").
 */
function toOrdinalNumber(number) {
    const suffixes = ["th", "st", "nd", "rd"];
    const lastTwoDigits = number % 100;
    return number + (suffixes[(lastTwoDigits - 20) % 10] || suffixes[lastTwoDigits] || suffixes[0]);
}
function initializeClock(id, endtime) {
  var clock = document.getElementById(id),
      monthsSpan = document.getElementById("months"),
      daysSpan = document.getElementById("days"),
      hoursSpan = document.getElementById("hours"),
      minutesSpan = document.getElementById("minutes"),
      secondsSpan = document.getElementById("seconds");

  function updateClock() {
    var timer = getTimeRemaining(endtime);
    monthsSpan.innerHTML = timer.months;
    daysSpan.innerHTML = timer.days;
    // hide months and/or days if they're 0
    monthsSpan.parentElement.classList.toggle("hidden", timer.months == 0);
    daysSpan.parentElement.classList.toggle("hidden", timer.days == 0);
    
    hoursSpan.innerHTML = ('0' + timer.hours).slice(-2);
    minutesSpan.innerHTML = ('0' + timer.minutes).slice(-2);
    // change text of .smalltext if plural or singular months/days/hours //, not caring about seconds
    monthsSpan.parentNode.querySelector('.smalltext').innerHTML="Month"+(timer.months == 1?"":"s");
    daysSpan.parentNode.querySelector('.smalltext').innerHTML="Day"+(timer.days == 1?"":"s");
    hoursSpan.parentNode.querySelector('.smalltext').innerHTML="Hour"+(timer.hours == 1?"":"s");
    minutesSpan.parentNode.querySelector('.smalltext').innerHTML="Minute"+(timer.minutes == 1?"":"s");
    secondsSpan.parentNode.querySelector('.smalltext').innerHTML="Second"+(timer.seconds == 1?"":"s");

    // not showing seconds when there's more than 1 month or more than 7 days to the next campaign
    if (showSeconds)
      secondsSpan.innerHTML = ('0' + timer.seconds).slice(-2);
    secondsSpan.parentElement.classList.toggle("hidden", !showSeconds);
    if (timer.finish) {
      return;
    }
    // source: https://www.mediawiki.org/wiki/MediaWiki:Gadget-UTCLiveClock.js
    // Schedule the next time change.
    //
    // We schedule the change for 100 ms _after_ the next clock tick. The delay
    // from setTimeout is not precise, and if we aim exactly for the tick, there
    // is a chance that the function will run slightly before it. If this
    // happens, we will display the same time for two seconds in a row - not
    // good. By scheduling 100 ms after the tick, we will always be about 100 ms
    // late, but we are also very likely to display a new time every second.
    var ms = today().getUTCMilliseconds();
    setTimeout( function () {
      updateClock();
    }, (1100) - ms );    
  }
  updateClock();
}
function renderCampaign({currentName, nextName, startMs, endMs}) {
  document.getElementById("campaignCounter").textContent =
    toOrdinalNumber(quartersSinceSummer2020(DateTime.fromMillis(startMs)));

  document.getElementById("currentCampaignName").textContent = currentName;
  document.getElementById("nextCampaignName").textContent = nextName;

  document.getElementById("releasedate").textContent =
    DateTime.fromMillis(endMs)
            .setLocale('en-UK')
            .toLocaleString({ ...DateTime.DATETIME_FULL, weekday: 'long' });
  initializeClock('clockdiv', endMs);
}
const thisYear = today().getUTCFullYear();
const schedule = [
    [`Jan 1 ${ thisYear } 00:00:00 UTC+1`, `Jan 1 ${ thisYear } 17:00 UTC+1`, `Winter ${ thisYear }`],
    [`Jan 1 ${ thisYear } 17:00:01 UTC+1`, `April 1 ${ thisYear } 17:00 UTC+2`, `Spring ${ thisYear }`],
    [`April 1 ${ thisYear } 17:00:01 UTC+2`, `July 1 ${ thisYear } 17:00 UTC+2`, `Summer ${ thisYear }`],
    [`July 1 ${ thisYear } 17:00:01 UTC+2`, `Oct 1 ${ thisYear } 17:00 UTC+2`, `Fall ${ thisYear }`],
    [`Oct 1 ${ thisYear } 17:00:01 UTC+2`, `Jan 1 ${ thisYear + 1 } 17:00 UTC+1`, `Winter ${ thisYear + 1 }`]
    ];
function getCampaignFromQuarter() {
  schedule.forEach(function (value, count) {
      var startDate = value[0],
          endDate = value[1],
          nextCampaignName = value[2],
          currentCampaignName;
      // put dates in milliseconds for easy comparison
      const startMs = Date.parse(startDate);
      const endMs = Date.parse(endDate);
      const currentMs = (today().getTime());
      // if current date is between start and end dates, display clock
      if (endMs > currentMs && currentMs >= startMs ) {
        if (count == 0) {
          currentCampaignName = schedule[3][2].toString().replace(thisYear, (thisYear - 1));
        }
        else 
          currentCampaignName = schedule[count-1][2];
        //renderCampaign(currentCampaignName, nextCampaignName, startMs, endMs);
        return {
                currentName: currentCampaignName,
                nextName: nextCampaignName,
                startMs: startMs,
                endMs: endMs
            };
      }
  });
}

async function getCampaignFromAPI() {
    const info = await getCampaignInfo();
    if (!info) return null;
    return {
        currentName: info.currentCampaign,
        nextName: nextSeason(info.currentCampaign),
        startMs: info.startTimestamp * 1000,
        endMs: info.endTimestamp * 1000
    };
}

async function init() {
    let campaign =
        await getCampaignFromAPI() ||
        getCampaignFromQuarter();
    if (!campaign) return;
    renderCampaign(campaign);
}
document.addEventListener("DOMContentLoaded", init);