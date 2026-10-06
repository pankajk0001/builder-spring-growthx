const OFFSET=330*60000,DAY=86400000;
const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
function parseMeetingDay(text){
 const day=DAYS.findIndex(day=>day.toLowerCase()===text.trim().toLowerCase());
 if(day<0)throw Error('Send the meeting day, for example Sunday. Any day of the week works.');
 return day;
}
function parseMeetingTime(text){
 const value=text.trim();
 const twelve=/^(1[0-2]|[1-9]):([0-5]\d)\s*(AM|PM)$/i.exec(value);
 const twentyFour=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
 if(twelve)return `${Number(twelve[1])}:${twelve[2]} ${twelve[3].toUpperCase()}`;
 if(twentyFour)return `${Number(twentyFour[1])%12||12}:${twentyFour[2]} ${Number(twentyFour[1])<12?'AM':'PM'}`;
 throw Error('Send the usual meeting time, like 14:30 or 2:30 PM (India time).');
}
function meetingDateStart(text){
 const match=/^(\d{1,2}) ([A-Za-z]+) (\d{4})$/.exec(text);
 if(!match)throw Error('Set a valid meeting date before starting its update cycle.');
 const day=Number(match[1]),month=MONTHS.findIndex(m=>m.toLowerCase()===match[2].toLowerCase()),year=Number(match[3]);
 const value=Date.UTC(year,month,day),d=new Date(value);
 if(month<0||year<1000||d.getUTCFullYear()!==year||d.getUTCMonth()!==month||d.getUTCDate()!==day)throw Error('That meeting date does not exist.');
 return value-OFFSET;
}
function meetingCutoff(date){return meetingDateStart(date)-DAY+20*3600000;}
function nextMeetingDate(day,after){
 if(!Number.isInteger(day)||day<0||day>6||!Number.isFinite(after))throw Error('A valid meeting day and reminder time are required.');
 const local=new Date(after+OFFSET);
 const ahead=(day-local.getUTCDay()+7)%7||7;
 const date=new Date(Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate()+ahead));
 return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}
module.exports={DAYS,parseMeetingDay,parseMeetingTime,meetingCutoff,nextMeetingDate};
