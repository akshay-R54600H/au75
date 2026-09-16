/**
 * Portal parser tests using the page shapes documented in lib/portal/*.ts.
 * Run with: node tests/parsers.test.mjs
 */
import { parseAttendance } from "../lib/portal/attendance.ts";
import { parseTimetable } from "../lib/portal/timetable.ts";
import { classify, findOtpForm, extractFormAction } from "../lib/portal/loginFlow.ts";

let passed = 0, failed = 0;
function assert(c, msg) {
  if (c) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

console.log("=== parseAttendance ===");
const attendanceHtml = `
<table><tbody>
<tr><td>1</td><td>Discrete Mathematics (E1CSA 316)</td><td>
  <table><tr><td>Theory</td><td>24.0</td><td>21.0</td><td><a>3.0</a></td><td>87.5</td></tr></table>
</td></tr>
<tr><td>2</td><td>Database Management Systems (E1CSA 320)</td><td>
  <table>
    <tr><td>Theory</td><td>16.0</td><td>14.0</td><td><a>2.0</a></td><td>87.5</td></tr>
    <tr><td>Practical</td><td>10.0</td><td>8.0</td><td><a>2.0</a></td><td>80.0</td></tr>
  </table>
</td></tr>
<tr><td></td><td>Total</td><td>50.0</td><td>43.0</td></tr>
</tbody></table>`;
const subjects = parseAttendance(attendanceHtml);
assert(subjects && subjects.length === 2, "two subjects parsed, Total row skipped");
assert(subjects[0].id === "portal-e1csa316" && subjects[0].code === "E1CSA316", "id/code normalised from '(E1CSA 316)'");
assert(subjects[0].name === "Discrete Mathematics", "name stripped of code");
assert(subjects[0].attended === 21 && subjects[0].total === 24, "theory-only totals");
assert(subjects[1].attended === 22 && subjects[1].total === 26, "theory + practical summed");

console.log("\n=== parseTimetable ===");
const cell = (name, code, fac, room) => `
  <input type="hidden" name="tp_name" value="Session 1">
  <p data-toggle="tooltip" title="Course Name: ${name}
  (${code})
  (Theory)">DM ( <span title="Faculty Name:${fac}">NUN</span> )</p>
  <p style="font-size: 11px;">${room}</p>`;
const timetableHtml = `
<table id="example1"><thead><tr>
  <th>Sl.No</th><th>Date</th><th>Day</th>
  <th>Session 1 <p>(08:00 - 08:55)</p></th><th>Session 2 <p>(09:00 - 09:55)</p></th>
</tr></thead>
<tbody>
<tr><td>1</td><td>03/08/2099</td><td>Monday</td><td>${cell("Discrete Mathematics", "E1CSA 316", "MS.NUPUR NANDI", "LT 407")}</td><td>&nbsp;</td></tr>
<tr><td>2</td><td>04/08/2020</td><td>Tuesday</td><td>&nbsp;</td><td>${cell("Operating Systems", "E1CSA 318", "MEERA IYER", "LT 305")}</td></tr>
</tbody></table>`;
const sessions = parseTimetable(timetableHtml);
assert(sessions && sessions.length === 2, "two sessions parsed, empty cells skipped");
assert(sessions[0].date === "2099-08-03" && sessions[0].isFuture === true, "dd/mm/yyyy → ISO, future flagged");
assert(sessions[1].date === "2020-08-04" && sessions[1].isFuture === false, "past date flagged");
assert(sessions[0].subjectId === "portal-e1csa316", "subjectId matches attendance id");
assert(sessions[0].startTime === "08:00" && sessions[0].endTime === "08:55", "session times from thead");
assert(sessions[1].session === 2 && sessions[1].startTime === "09:00", "second session slot");
assert(sessions[0].faculty === "MS.NUPUR NANDI" && sessions[0].room === "LT 407", "faculty + room");

console.log("\n=== loginFlow ===");
assert(classify('<form name="loginform" action="StudentLoginAction.do"><input name="captchaId"></form>') === "login", "login page");
assert(classify('<html>Student Attendance summary table</html>') === "data", "data page");
assert(classify('<form action="verifyOtp.do"><input name="otpValue"></form>') === "otp", "otp page");
assert(extractFormAction('<form method="post" action="/auerp/StudentLoginAction.do;jsessionid=X.tomcat1">') === "/auerp/StudentLoginAction.do;jsessionid=X.tomcat1", "form action extracted");
const otp = findOtpForm('<form action="/auerp/search.do"><input name="q"></form><form action="/auerp/StudentLoginAction.do"><input name="method" value="verifyOtp"><input name="otpValue" value=""></form>');
assert(otp && otp.otpField === "otpValue" && otp.action === "/auerp/StudentLoginAction.do" && otp.fields.method === "verifyOtp", "OTP form found, search form ignored");

console.log(`\n${"─".repeat(44)}\nTotal: ${passed + failed} | ✓ ${passed} passed | ✗ ${failed} failed`);
if (failed > 0) process.exit(1);
