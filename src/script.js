// needs the following libraries
// serverTime, for synchronising local clock to server:
// https://nextcampaign.m8.no/time.php (.phps for source)
// Luxon for calculating time diffrence, including months
// https://moment.github.io/luxon/
// this page is based on: https://www.sitepoint.com/build-javascript-countdown-timer-no-dependencies/
//serverTime = new Date('July 1 2022 17:00:01 UTC+2');
//serverTime = new Date('July 1 2022 16:59:50 UTC+2');
//serverTime = new Date('Sept 4 2022 16:59:50 UTC+1');
//serverTime = new Date('Feb 20 2022 23:59:50 UTC+1');
//serverTime = new Date('Dec 31 2021 23:59:50 UTC+1');
var localTime = Date.now();
var timeDiff = 0;

if (typeof serverTime != "undefined")
  timeDiff = serverTime - localTime;
function today() {
  return new Date(Date.now() + timeDiff);
}
const DateTime = luxon.DateTime;
const Duration = luxon.Duration;

function getTimeRemaining(endtime) {
  var diff = DateTime.fromMillis(new Date(endtime).getTime()).diff(DateTime.fromMillis(today().getTime()), ['months', 'days', 'hours', 'minutes', 'seconds', 'milliseconds']);
  var months = diff.months,
      days = diff.days,
      hours = diff.hours,
      minutes = diff.minutes,
      seconds = diff.seconds,
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
  //const monthsSpan = clock.querySelector('.months');

  function updateClock() {
    const timer = getTimeRemaining(endtime);
    monthsSpan.innerHTML = timer.months;
    daysSpan.innerHTML = timer.days;
    // hide months and/or days if they're 0
    monthsSpan.parentElement.classList.toggle("hidden", timer.months == 0);
    daysSpan.parentElement.classList.toggle("hidden", timer.days == 0);
    
    hoursSpan.innerHTML = ('0' + timer.hours).slice(-2);
    minutesSpan.innerHTML = ('0' + timer.minutes).slice(-2);
    // no need to show seconds when there's more than 1 month to the next campaign
    if (timer.months < 1)
      secondsSpan.innerHTML = ('0' + timer.seconds).slice(-2);
    secondsSpan.parentElement.classList.toggle("hidden", timer.months > 0);
    if (timer.finish) {
      console.log("finish");
      //clearInterval(timeinterval);
      //setTimeout(ready(), 1024);
      return;
    }
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
  //const timeinterval = setInterval(updateClock, 1000);
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
        DateTime.fromMillis(new Date(endDate).getTime()).setLocale('en-UK').toLocaleString(luxon.DateTime.DATETIME_FULL);
      initializeClock('clockdiv', endDate);
    }
  });
}
document.addEventListener("DOMContentLoaded", ready);