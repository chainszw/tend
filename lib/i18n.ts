import type { DayPart } from "@/lib/schedule";
import type { VoiceLanguage } from "@/lib/voice/language";

/**
 * Words for the signed-in shell, Today and Ask, in English and Hindi. Pure data, so it is
 * the same on the server and in the browser. People's names, medicine names and doctors are
 * never translated; they are passed in as they were written.
 */

const en = {
  // Shell
  circleLine: (elder: string, member: string) => `${elder}'s family, signed in as ${member}`,
  settings: "Settings",
  signOut: "Sign out",
  textSize: "Text size",
  textSizeValue: (percent: number) => `${percent} percent`,
  resetTextSize: "Reset to standard",
  language: "Language",
  languageLegend: "Language for the app, voice and answers",
  beta: "Beta",
  hindiBetaNote: "Hindi voice and translation are in beta. Some pages are still in English.",
  mainNav: "Main",
  nav: { today: "Today", medicines: "Medicines", visits: "Visits", health: "Health", ask: "Ask", family: "Family" },

  // Today
  greeting: (hour: number, name: string) =>
    `${hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"}, ${name}`,
  eldersDay: (elder: string) => `${elder}'s day`,
  readMyDay: "Read my day aloud",
  noMedsTitle: "No medicines are scheduled today",
  noMedsBody: "Add a medicine by hand, or paste a prescription and let Tend read it into a schedule.",
  addMedicines: "Add medicines",
  missedOne: (med: string) => `${med} has not been marked as taken. If it was taken, mark it below.`,
  missedMany: (count: number) =>
    `${count} doses have not been marked as taken. If they were taken, mark them below.`,
  dueOne: (med: string) => `It is time for ${med}.`,
  dueMany: (count: number) => `${count} medicines are due now.`,
  allDone: "Everything for today is done.",
  nothingDue: "Nothing is due right now. The next dose is listed below.",
  dayParts: { morning: "Morning", afternoon: "Afternoon", evening: "Evening", night: "Night" } satisfies Record<
    DayPart,
    string
  >,
  nothingScheduled: "Nothing scheduled",
  nextVisit: "Next doctor visit",
  noVisits: "No visits are booked.",
  seeAllVisits: "See all visits",
  addVisit: "Add a visit",

  // Dose card
  status: { taken: "Taken", skipped: "Skipped", missed: "Not marked yet", due: "Due now", later: "Later" },
  taken: "Taken",
  skip: "Skip",
  undo: "Undo",
  markTaken: (med: string, when: string) => `Mark ${med} at ${when} as taken`,
  markSkipped: (med: string, when: string) => `Mark ${med} at ${when} as skipped`,
  undoLabel: (med: string, when: string) => `Undo ${med} at ${when}`,
  doseSaved: { taken: "marked as taken", skipped: "marked as skipped", clear: "mark removed" },
  doseFailed: "That did not save. Try again.",

  // Week strip
  thisWeek: "This week",
  weekNone: "No doses were due in the last 7 days.",
  weekSummary: (taken: number, expected: number, percent: number) =>
    `${taken} of ${expected} doses taken in the last 7 days (${percent}%).`,
  streak: (days: number) => ` ${days} days in a row with every dose taken.`,
  today: "Today",
  dayNone: "no doses due",
  dayDoses: (taken: number, expected: number) => `${taken} of ${expected} doses taken`,

  // Read aloud
  readAloud: "Read this aloud",
  stopReading: "Stop reading",

  // Ask page
  askTitle: "Ask the Care Companion",
  askSubtitle: (elder: string | null) =>
    `Plain answers about ${elder ? `${elder}'s` : "your"} medicines, schedule and doctor visits.`,
  suggestionsElder: (medicine: string | undefined) => [
    "What do I still need to take today?",
    medicine ? `What is ${medicine} for, and how should I take it?` : "How do I add my medicines?",
    "I forgot a dose this morning. What should I do?",
    "When is my next doctor visit?",
  ],
  suggestionsFamily: (elder: string) => [
    `How has ${elder} been doing with medicines this week?`,
    `What does ${elder} still need to take today?`,
    "What should we ask at the next doctor visit?",
    "How can I help without taking over?",
  ],
  notSetUp: "The Companion is not set up yet. Add an Adaption API key to turn it on.",
  disclaimer: "Not a doctor, and never changes a dose. In an emergency, call 112.",
  answersFrom: (grounded: boolean) =>
    `Answers come from Adaption AI using this family's own schedule${
      grounded ? " and a care-guidance dataset prepared with Adaption Adaptive Data" : ""
    }.`,

  // Companion chat
  chatLabel: "Chat with the Care Companion",
  companionName: "Care Companion",
  readAnswersAloud: "Read answers aloud",
  chatHello: "Hello! Ask me about medicines, today's doses or the next doctor visit.",
  suggested: "Suggested questions",
  conversation: "Conversation",
  youAsked: "You asked: ",
  companionAnswered: "Companion answered: ",
  readThisAnswer: "Read this answer aloud",
  writing: "The Companion is writing an answer…",
  yourQuestion: "Your question",
  placeholderSpeak: "Type or speak…",
  placeholderType: "Type here…",
  askButton: "Ask the Companion",
  speakQuestion: "Speak your question",
  finishedSpeaking: "I have finished",
  listening: "Listening… ",
  cancel: "Cancel",
  companionFailed: "The Companion could not answer. Try again.",
};

export type Messages = typeof en;

const hi: Messages = {
  circleLine: (elder, member) => `${elder} का देखभाल परिवार, ${member} के रूप में जुड़े हैं`,
  settings: "सेटिंग्स",
  signOut: "बाहर निकलें",
  textSize: "अक्षरों का आकार",
  textSizeValue: (percent) => `${percent} प्रतिशत`,
  resetTextSize: "सामान्य आकार पर लौटें",
  language: "भाषा",
  languageLegend: "ऐप, आवाज़ और जवाबों की भाषा",
  beta: "बीटा",
  hindiBetaNote: "हिन्दी आवाज़ और अनुवाद अभी बीटा में हैं। कुछ पन्ने अभी अंग्रेज़ी में हैं।",
  mainNav: "मुख्य",
  nav: { today: "आज", medicines: "दवाइयाँ", visits: "डॉक्टर", health: "सेहत", ask: "पूछें", family: "परिवार" },

  greeting: (hour, name) => `${hour < 12 ? "सुप्रभात" : hour < 17 ? "नमस्ते" : "शुभ संध्या"}, ${name}`,
  eldersDay: (elder) => `${elder} का दिन`,
  readMyDay: "मेरा दिन पढ़कर सुनाएँ",
  noMedsTitle: "आज कोई दवा तय नहीं है",
  noMedsBody: "दवा खुद जोड़ें, या पर्चा चिपकाएँ और Tend उसे समय-सारणी में बदल देगा।",
  addMedicines: "दवाइयाँ जोड़ें",
  missedOne: (med) => `${med} ली हुई नहीं लिखी गई है। अगर ले ली है, तो नीचे लिखें।`,
  missedMany: (count) => `${count} खुराक ली हुई नहीं लिखी गई हैं। अगर ले ली हैं, तो नीचे लिखें।`,
  dueOne: (med) => `${med} लेने का समय हो गया है।`,
  dueMany: (count) => `अभी ${count} दवाइयाँ लेनी हैं।`,
  allDone: "आज का सब काम हो गया।",
  nothingDue: "अभी कुछ नहीं लेना है। अगली खुराक नीचे दी गई है।",
  dayParts: { morning: "सुबह", afternoon: "दोपहर", evening: "शाम", night: "रात" },
  nothingScheduled: "कुछ तय नहीं है",
  nextVisit: "अगली डॉक्टर मुलाक़ात",
  noVisits: "कोई मुलाक़ात तय नहीं है।",
  seeAllVisits: "सभी मुलाक़ातें देखें",
  addVisit: "मुलाक़ात जोड़ें",

  status: { taken: "ले ली", skipped: "छोड़ दी", missed: "अभी नहीं लिखी", due: "अभी लेनी है", later: "बाद में" },
  taken: "ले ली",
  skip: "छोड़ें",
  undo: "वापस लें",
  markTaken: (med, when) => `${when} की ${med} ली हुई लिखें`,
  markSkipped: (med, when) => `${when} की ${med} छोड़ी हुई लिखें`,
  undoLabel: (med, when) => `${when} की ${med} का निशान हटाएँ`,
  doseSaved: { taken: "ली हुई लिखी गई", skipped: "छोड़ी हुई लिखी गई", clear: "निशान हटाया गया" },
  doseFailed: "यह सहेजा नहीं गया। फिर से कोशिश करें।",

  thisWeek: "यह हफ़्ता",
  weekNone: "पिछले 7 दिनों में कोई खुराक तय नहीं थी।",
  weekSummary: (taken, expected, percent) =>
    `पिछले 7 दिनों में ${expected} में से ${taken} खुराक ली गईं (${percent}%)।`,
  streak: (days) => ` लगातार ${days} दिन हर खुराक ली गई।`,
  today: "आज",
  dayNone: "कोई खुराक तय नहीं",
  dayDoses: (taken, expected) => `${expected} में से ${taken} खुराक ली गईं`,

  readAloud: "पढ़कर सुनाएँ",
  stopReading: "सुनाना बंद करें",

  askTitle: "देखभाल साथी से पूछें",
  askSubtitle: (elder) =>
    `${elder ? `${elder} की` : "आपकी"} दवाइयों, समय-सारणी और डॉक्टर मुलाक़ातों के बारे में आसान जवाब।`,
  suggestionsElder: (medicine) => [
    "आज मुझे और कौन-सी दवा लेनी है?",
    medicine ? `${medicine} किस लिए है, और इसे कैसे लूँ?` : "मैं अपनी दवाइयाँ कैसे जोड़ूँ?",
    "मैं आज सुबह की खुराक भूल गया/गई। क्या करूँ?",
    "मेरी अगली डॉक्टर मुलाक़ात कब है?",
  ],
  suggestionsFamily: (elder) => [
    `इस हफ़्ते ${elder} ने दवाइयाँ कैसे लीं?`,
    `आज ${elder} को और कौन-सी दवा लेनी है?`,
    "अगली डॉक्टर मुलाक़ात में हमें क्या पूछना चाहिए?",
    "मैं बिना दख़ल दिए कैसे मदद करूँ?",
  ],
  notSetUp: "देखभाल साथी अभी चालू नहीं है। इसे चालू करने के लिए Adaption API key जोड़ें।",
  disclaimer: "यह डॉक्टर नहीं है और कभी खुराक नहीं बदलता। आपात स्थिति में 112 पर फ़ोन करें।",
  answersFrom: (grounded) =>
    `जवाब Adaption AI से आते हैं, इस परिवार की अपनी समय-सारणी के आधार पर${
      grounded ? " और Adaption Adaptive Data से तैयार देखभाल-जानकारी के साथ" : ""
    }।`,

  chatLabel: "देखभाल साथी से बात करें",
  companionName: "देखभाल साथी",
  readAnswersAloud: "जवाब पढ़कर सुनाएँ",
  chatHello: "नमस्ते! दवाइयों, आज की खुराक या अगली डॉक्टर मुलाक़ात के बारे में पूछें।",
  suggested: "सुझाए गए सवाल",
  conversation: "बातचीत",
  youAsked: "आपने पूछा: ",
  companionAnswered: "साथी का जवाब: ",
  readThisAnswer: "यह जवाब पढ़कर सुनाएँ",
  writing: "साथी जवाब लिख रहा है…",
  yourQuestion: "आपका सवाल",
  placeholderSpeak: "लिखें या बोलें…",
  placeholderType: "यहाँ लिखें…",
  askButton: "साथी से पूछें",
  speakQuestion: "अपना सवाल बोलें",
  finishedSpeaking: "मैंने बोल लिया",
  listening: "सुन रहा है… ",
  cancel: "रद्द करें",
  companionFailed: "साथी जवाब नहीं दे सका। फिर से कोशिश करें।",
};

const MESSAGES: Record<VoiceLanguage, Messages> = { en, hi };

/** The word list for a language. */
export function messages(lang: VoiceLanguage): Messages {
  return MESSAGES[lang];
}

/** The locale used to write dates in that language. */
export function dateLocale(lang: VoiceLanguage): "en-IN" | "hi-IN" {
  return lang === "hi" ? "hi-IN" : "en-IN";
}
