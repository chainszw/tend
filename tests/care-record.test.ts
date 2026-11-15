import { describe, expect, it } from "vitest";
import { buildDay, indexLogs, summariseAdherence } from "@/lib/adherence";
import {
  describeAdherence,
  describeAppointments,
  describeMedications,
  describeToday,
} from "@/lib/care-record";
import { spokenDaySummary } from "@/lib/speech";

const TZ = "Asia/Kolkata";
const med = {
  id: "med-1",
  name: "Metformin",
  dosage: "500 mg",
  instructions: "After food",
  purpose: "Blood sugar",
  times: ["08:00", "20:00"],
  days: [0, 1, 2, 3, 4, 5, 6],
  start_date: "2026-11-14",
  end_date: null,
  active: true,
};
const now = new Date("2026-11-15T06:00:00Z"); // 11:30 IST
const logs = [
  { medication_id: "med-1", scheduled_for: "2026-11-15T02:30:00Z", status: "taken" as const },
];
const slots = buildDay([med], indexLogs(logs), "2026-11-15", TZ, now);

describe("care record text for the AI", () => {
  it("describes medicines on one line each", () => {
    expect(describeMedications([med])).toBe(
      "- Metformin 500 mg; at 8:00 am, 8:00 pm; how: After food; for: Blood sugar",
    );
    expect(describeMedications([])).toBe("No medicines are on the schedule.");
  });

  it("describes today's doses with their status", () => {
    expect(describeToday(slots)).toBe(
      "- 8:00 am Metformin: taken\n- 8:00 pm Metformin: later today",
    );
    expect(describeToday([])).toBe("No doses are scheduled today.");
  });

  it("describes adherence in plain numbers", () => {
    const text = describeAdherence(summariseAdherence([med], logs, TZ, now));
    expect(text).toContain("1 of 3 due doses taken (33%)");
    expect(text).toContain("Days with at least one missed dose: 1");
    expect(describeAdherence(summariseAdherence([], [], TZ, now))).toBe(
      "No doses were due in the last 7 days.",
    );
  });

  it("describes appointments", () => {
    const text = describeAppointments([
      { doctor: "Dr. Rao", specialty: "Cardiology", location: "City Clinic", notes: "", when: "Monday 10:30 am" },
    ]);
    expect(text).toBe("- Monday 10:30 am: Dr. Rao (Cardiology); City Clinic");
    expect(describeAppointments([])).toBe("No upcoming appointments.");
  });
});

describe("spokenDaySummary", () => {
  it("reads out what is still to come and what is done", () => {
    const text = spokenDaySummary("Sunday, 15 November", slots);
    expect(text).toContain("Today is Sunday, 15 November.");
    expect(text).toContain("Later today: Metformin, 500 mg, at 8:00 pm.");
    expect(text).toContain("Already taken: 1 dose.");
  });

  it("says so when the day is finished or empty", () => {
    const done = buildDay(
      [{ ...med, times: ["08:00"] }],
      indexLogs(logs),
      "2026-11-15",
      TZ,
      now,
    );
    expect(spokenDaySummary("Sunday", done)).toContain("Everything for today is done.");
    expect(spokenDaySummary("Sunday", [])).toContain("no medicines scheduled");
  });

  it("speaks Hindi when asked, keeping medicine names as written", () => {
    const text = spokenDaySummary("रविवार, 15 नवंबर", slots, "hi");
    expect(text).toContain("आज रविवार, 15 नवंबर है।");
    expect(text).toContain("आज बाद में: Metformin, 500 mg, शाम 8:00 बजे।");
    expect(text).toContain("1 खुराक ली जा चुकी है।");
    expect(spokenDaySummary("रविवार", [], "hi")).toContain("कोई दवा तय नहीं");
  });
});
