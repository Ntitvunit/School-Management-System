import { TERM_NAMES } from "@/lib/terms";

export type Topic = {
  id: string; class_code: string; subject_id: string; term: number; week: string; week_start: number;
  week_type: string; topic: string; subtopics: string[]; objectives: string[];
  teacher_activities: string[]; pupil_activities: string[]; resources: string[]; source_page: number;
};

export const WEEK_LABEL: Record<string, string> = {
  midterm_assessment: "Mid-term test", midterm_break: "Break", revision: "Revision",
  examination: "Exam", closing: "Closing", teaching: "",
};

export const SCIENCE_SUBJECTS = new Set(["basic-science-and-technology", "basic-science", "pre-science"]);

export function lessonNoteTemplate(t: Topic, o: { school: string; session: string; className: string; subject: string; teacher: string }) {
  const objectives = (t.objectives?.length ? t.objectives : t.subtopics || []).map((s, i) => `  ${i + 1}. ${s}`).join("\n") || "  1. ";
  const steps = t.teacher_activities?.length
    ? t.teacher_activities.map((s, i) => `  Step ${i + 1}: ${s}`).join("\n")
    : "  Step 1: Introduction\n  Step 2: Presentation\n  Step 3: Pupils' activity";
  return `LESSON NOTE
School: ${o.school}        Session: ${o.session}
Class: ${o.className}        Subject: ${o.subject}
Term: ${TERM_NAMES[t.term]}        Week: ${t.week}
Date: ____________        Duration: 40 minutes
Teacher: ${o.teacher}

TOPIC: ${t.topic}

LEARNING OBJECTIVES (by the end of the lesson, pupils should be able to):
${objectives}

INSTRUCTIONAL MATERIALS:
  ${(t.resources?.length ? t.resources : ["Chalkboard", "Charts"]).join(", ")}

PREVIOUS KNOWLEDGE:
  

PRESENTATION:
${steps}

PUPILS' ACTIVITIES:
${t.pupil_activities?.length ? t.pupil_activities.map((s) => "  - " + s).join("\n") : "  - "}

EVALUATION:
  

ASSIGNMENT:
  
`;
}
