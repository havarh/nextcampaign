/* needs the following libraries
 * serverTime, for synchronising local clock to server:
 * https://nextcampaign.m8.no/time.php (.phps for source)
 * Luxon for calculating time diffrence, including months
 * https://moment.github.io/luxon/
 * this code is based on: https://www.sitepoint.com/build-javascript-countdown-timer-no-dependencies/
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
// vibe coded, gets endTimestamp stored from Trackmania API
function getEndTimestamp() {
    if (!('CAMPAIGN_END_TIMESTAMP' in window)) return 0;
    const end = window.CAMPAIGN_END_TIMESTAMP;
    return end > Date.now() / 1000 ? end : 0;
}
// vibe coded, gets campaign info from cached Trackmania API
let cachedCampaign = undefined;
async function getCampaignInfo() {
    if (cachedCampaign !== undefined) return cachedCampaign;

    try {
        const res = await fetch('/campaign_info_test.json', { cache: 'no-store' });
        if (!res.ok) return cachedCampaign = null;

        const data = await res.json();
        const end = Number(data?.endTimestamp ?? 0);
        const now = Math.floor(Date.now() / 1000);

        return cachedCampaign = (end && now <= end) ? data : null;
    } catch {
        return cachedCampaign = null;
    }
}

// vibe coded, gets next season based on current season
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
// rounds down Date object or timestamp in milliseconds to nearest minute
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
function quartersSinceSummer2020(currentDate) {
    const startDate = DateTime.local(2020, 6, 1); // June 1, 2020
    const startQuarter = startDate.quarter;
    const currentQuarter = currentDate.quarter;

    const yearDifference = currentDate.year - startDate.year;
    const totalQuarters = yearDifference * 4 + (currentQuarter - startQuarter);

    return totalQuarters;
}
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
      console.log("finish");
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
function renderCampaign(currentName, nextName, startMs, endMs) {
    document.getElementById("campaignCounter").textContent =
        toOrdinalNumber(quartersSinceSummer2020(DateTime.fromMillis(startMs)));

    document.getElementById("currentCampaignName").textContent = currentName;
    document.getElementById("campaignName").textContent = nextName;

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
function getCampaignFromQuarter () {
  
}
function ready() {
  // if endTimestamp is successfully read from Trackmania API use it instead
  if (getEndTimestamp()) {
    currentCampaignName = window.CURRENT_CAMPAIGN;
    campaignName = nextSeason(currentCampaignName);
    startMs = window.CAMPAIGN_START_TIMESTAMP * 1000;
    endMs = getEndTimestamp() * 1000;
    renderCampaign(currentCampaignName, campaignName, startMs, endMs);
  }
  else schedule.forEach(function (value, count) {
    var startDate = value[0],
        endDate = value[1],
        campaignName = value[2],
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
      renderCampaign(currentCampaignName, campaignName, startMs, endMs);
      /*document.getElementById("campaignCounter").innerHTML = toOrdinalNumber(quartersSinceSummer2020(DateTime.fromMillis(startMs)));
      document.getElementById("campaignName").innerHTML = campaignName;
      document.getElementById("currentCampaignName").innerHTML = currentCampaignName;
      document.getElementById("releasedate").innerHTML =
        DateTime.fromMillis(new Date(endDate).getTime()).setLocale('en-UK').toLocaleString({...DateTime.DATETIME_FULL, weekday: 'long' });
      initializeClock('clockdiv', endDate);*/
    }
  });
}
document.addEventListener("DOMContentLoaded", ready);