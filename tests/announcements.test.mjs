import test from "node:test";
import assert from "node:assert/strict";
import {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  listActiveAnnouncements,
  isAnnouncementActive,
  AnnouncementValidationError,
  AnnouncementNotFoundError,
} from "../lib/server/announcementsDb.ts";

const ADMIN = "admin@au75.vercel.app";
const HOUR = 60 * 60 * 1000;

test("announcements: isAnnouncementActive honours enabled flag and expiry", () => {
  const now = Date.now();
  assert.equal(isAnnouncementActive({ enabled: true, expiresAt: null }, now), true);
  assert.equal(isAnnouncementActive({ enabled: false, expiresAt: null }, now), false);
  assert.equal(isAnnouncementActive({ enabled: true, expiresAt: new Date(now + HOUR).toISOString() }, now), true);
  assert.equal(isAnnouncementActive({ enabled: true, expiresAt: new Date(now - HOUR).toISOString() }, now), false);
});

test("announcements: create, edit, enable/disable and delete (fallback store)", async () => {
  const created = await createAnnouncement(
    { title: "  Mid-sem exams  ", message: "Exams start on 3 Nov.", type: "news" },
    ADMIN
  );
  assert.equal(created.title, "Mid-sem exams", "title is trimmed");
  assert.equal(created.type, "news");
  assert.equal(created.enabled, true, "new announcements are enabled by default");
  assert.equal(created.expiresAt, null);
  assert.equal(created.updatedBy, ADMIN);

  let active = await listActiveAnnouncements();
  assert.ok(active.some((a) => a.id === created.id), "new announcement is active");

  // Disable → hidden from students but still listed for the admin
  await updateAnnouncement(created.id, { enabled: false }, ADMIN);
  active = await listActiveAnnouncements();
  assert.ok(!active.some((a) => a.id === created.id), "disabled announcement is not active");
  const all = await listAnnouncements(true);
  assert.ok(all.some((a) => a.id === created.id), "disabled announcement remains in admin list");

  // Edit fields + re-enable with a past expiry → still not active
  const edited = await updateAnnouncement(
    created.id,
    { title: "Exam update", type: "notice", enabled: true, expiresAt: new Date(Date.now() - HOUR).toISOString() },
    ADMIN
  );
  assert.equal(edited.title, "Exam update");
  assert.equal(edited.type, "notice");
  assert.equal(edited.message, "Exams start on 3 Nov.", "omitted fields are preserved");
  active = await listActiveAnnouncements();
  assert.ok(!active.some((a) => a.id === created.id), "expired announcement is not active");

  // Clear expiry → active again
  await updateAnnouncement(created.id, { expiresAt: null }, ADMIN);
  active = await listActiveAnnouncements();
  assert.ok(active.some((a) => a.id === created.id), "announcement with cleared expiry is active");

  await deleteAnnouncement(created.id);
  const afterDelete = await listAnnouncements(true);
  assert.ok(!afterDelete.some((a) => a.id === created.id), "deleted announcement is gone");
});

test("announcements: optional symbol is saved, editable and validated", async () => {
  const plain = await createAnnouncement({ title: "No symbol", message: "Uses the type icon." }, ADMIN);
  assert.equal(plain.icon, null, "symbol defaults to Auto (null)");

  const withIcon = await createAnnouncement({ title: "Exam week", message: "Check the ERP.", icon: "exam" }, ADMIN);
  assert.equal(withIcon.icon, "exam");
  const active = await listActiveAnnouncements();
  assert.equal(active.find((a) => a.id === withIcon.id)?.icon, "exam", "symbol is served to students");

  const changed = await updateAnnouncement(withIcon.id, { icon: "caution" }, ADMIN);
  assert.equal(changed.icon, "caution");
  assert.equal(changed.title, "Exam week", "other fields untouched");
  const cleared = await updateAnnouncement(withIcon.id, { icon: null }, ADMIN);
  assert.equal(cleared.icon, null, "symbol can be reset to Auto");

  await assert.rejects(createAnnouncement({ title: "x", message: "y", icon: "skull" }, ADMIN), AnnouncementValidationError);
  await assert.rejects(updateAnnouncement(withIcon.id, { icon: "__proto__" }, ADMIN), AnnouncementValidationError);

  await deleteAnnouncement(plain.id);
  await deleteAnnouncement(withIcon.id);
});

test("announcements: validation and not-found errors", async () => {
  await assert.rejects(createAnnouncement({ title: "", message: "x" }, ADMIN), AnnouncementValidationError);
  await assert.rejects(createAnnouncement({ title: "x", message: "   " }, ADMIN), AnnouncementValidationError);
  await assert.rejects(createAnnouncement({ title: "x", message: "y", type: "spam" }, ADMIN), AnnouncementValidationError);
  await assert.rejects(createAnnouncement({ title: "x", message: "y", expiresAt: "not-a-date" }, ADMIN), AnnouncementValidationError);
  await assert.rejects(createAnnouncement({ title: "x".repeat(81), message: "y" }, ADMIN), AnnouncementValidationError);

  await assert.rejects(updateAnnouncement("missing-id", { enabled: false }, ADMIN), AnnouncementNotFoundError);
  await assert.rejects(deleteAnnouncement("missing-id"), AnnouncementNotFoundError);
});
