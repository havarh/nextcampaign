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
    // change text of .smalltext if plural or singular months/days/hours, not caring about seconds
    monthsSpan.parentNode.querySelector('.smalltext').innerHTML=(timer.months == 1?"Month":"Months");
    daysSpan.parentNode.querySelector('.smalltext').innerHTML=(timer.days == 1?"Day":"Days");
    hoursSpan.parentNode.querySelector('.smalltext').innerHTML=(timer.hours == 1?"Hour":"Hours");
    minutesSpan.parentNode.querySelector('.smalltext').innerHTML=(timer.minutes == 1?"Minute":"Minutes");

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

const thisYear = today().getUTCFullYear();
const  schedule = [
    [`Jan 1 ${ thisYear } 00:00:00 UTC+1`, `Jan 1 ${ thisYear } 17:00 UTC+1`, `Winter ${ thisYear }`],
    [`Jan 1 ${ thisYear } 17:00:01 UTC+1`, `April 1 ${ thisYear } 17:00 UTC+2`, `Spring ${ thisYear }`],
    [`April 1 ${ thisYear } 17:00:01 UTC+2`, `July 1 ${ thisYear } 17:00 UTC+2`, `Summer ${ thisYear }`],
    [`July 1 ${ thisYear } 17:00:01 UTC+2`, `Oct 1 ${ thisYear } 17:00 UTC+2`, `Fall ${ thisYear }`],
    [`Oct 1 ${ thisYear } 17:00:01 UTC+2`, `Jan 1 ${ thisYear + 1 } 17:00 UTC+1`, `Winter ${ thisYear + 1 }`]
    ];
function ready() {
  //schedule.forEach(([startDate, endDate, campaignName]) => {
  schedule.forEach(function (value, count) {
    var startDate = value[0],
        endDate = value[1],
        campaignName = value[2],
        currentCampaignName;
    // put dates in milliseconds for easy comparisons
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
      document.getElementById("campaignName").innerHTML = campaignName;
      document.getElementById("currentCampaignName").innerHTML = currentCampaignName;
      document.getElementById("releasedate").innerHTML =
        DateTime.fromMillis(new Date(endDate).getTime()).setLocale('en-UK').toLocaleString(DateTime.DATETIME_FULL);
      initializeClock('clockdiv', endDate);
    }
  });
}
document.addEventListener("DOMContentLoaded", ready);