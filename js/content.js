/* =============================================================
   content.js — CEFR-tiered content bank
   Every collection is keyed by level (A1..C2) so that a trainee
   only ever sees material written for their own tier.
   ============================================================= */

export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export const LEVEL_LABEL = {
  A1: 'A1 · Beginner',
  A2: 'A2 · Elementary',
  B1: 'B1 · Intermediate',
  B2: 'B2 · Upper intermediate',
  C1: 'C1 · Advanced',
  C2: 'C2 · Proficient'
};

/* -------------------------------------------------------------
   STAGE 1 — WARM-UP
   Three rotating formats. The session picks the next format in the
   rotation based on how many sessions the trainee has already had,
   so nobody gets the same opener twice in a row.
   ------------------------------------------------------------- */

export const WARMUP_FORMATS = [
  { id: 'rapid', name: 'Rapid personal questions', hint: 'Fire them fast. Short answers only — do not correct anything.' },
  { id: 'thisOrThat', name: 'This or that', hint: 'Trainee picks one and says why in a few words.' },
  { id: 'chain', name: 'One-word story chain', hint: 'You add one word, then the trainee adds one word. Keep going until the sentence collapses.' }
];

export const WARMUPS = {
  rapid: {
    A1: ['What is your name?', 'How are you today?', 'What colour is your shirt?', 'Do you like coffee or tea?', 'How many brothers and sisters do you have?', 'What did you eat this morning?', 'Where do you live?', 'What day is it today?'],
    A2: ['What did you do yesterday evening?', 'Who do you live with?', 'What is your favourite food and why?', 'How do you get to work?', 'What time do you usually wake up?', 'What did you watch last week?', 'Do you prefer summer or winter?', 'What are you doing this weekend?'],
    B1: ['What is something you learned recently?', 'Describe your ideal weekend.', 'What annoys you in traffic?', 'Tell me about a place you want to visit.', 'What is a skill you wish you had?', 'What was the last thing that made you laugh?', 'How has your week been so far?', 'What do you usually do to relax?'],
    B2: ['What is a habit you would like to break?', 'Describe a decision you regret slightly.', 'What is overrated in your opinion?', 'How do you deal with a stressful day?', 'What is something people misunderstand about your job?', 'Tell me about a time you changed your mind.', 'What do you think you will be doing in five years?', 'What is the best advice you have ignored?'],
    C1: ['What is a belief you held strongly that you no longer hold?', 'Where do you think you are unusually stubborn?', 'What is a trend you refuse to follow?', 'Describe something you find beautiful that others find boring.', 'What would you do differently if nobody was watching?', 'What is a compliment you struggle to accept?', 'Which of your opinions would surprise your friends?', 'What is something you are quietly proud of?'],
    C2: ['What idea have you not been able to argue yourself out of?', 'Where does your intuition consistently outperform your reasoning?', 'What do you think your generation gets systematically wrong?', 'Describe a contradiction you live with comfortably.', 'What is the most useful thing you have unlearned?', 'Which of your certainties is probably a habit?', 'What would you defend even if it made you unpopular?', 'What question do you wish people asked you?']
  },
  thisOrThat: {
    A1: ['Tea or coffee?', 'Cat or dog?', 'Morning or night?', 'Pizza or rice?', 'Bus or walk?', 'Red or blue?', 'Hot or cold?', 'Book or TV?'],
    A2: ['Cooking at home or eating out?', 'Beach holiday or city holiday?', 'Text message or phone call?', 'Early bird or night owl?', 'Big party or small dinner?', 'Music or silence while working?', 'Plan everything or decide later?', 'Shower in the morning or at night?'],
    B1: ['Working alone or in a team?', 'Saving money or spending on experiences?', 'Reading the book or watching the film?', 'A job you love with low pay, or a boring job with high pay?', 'Living in the city centre or the suburbs?', 'Learning fast and forgetting, or learning slowly and keeping it?', 'Being early or being relaxed?', 'Honest feedback or gentle feedback?'],
    B2: ['Being respected or being liked?', 'Total freedom with no security, or full security with no freedom?', 'Knowing the truth or keeping the illusion?', 'Depth in one field or range across many?', 'A short intense career or a long steady one?', 'Being underestimated or being overestimated?', 'Making the decision or living with someone else\'s?', 'Public failure or private stagnation?'],
    C1: ['Being irreplaceable or being free to leave?', 'A life of comfort or a life of meaning that costs you?', 'Being the smartest in the room or the least experienced?', 'Radical honesty or diplomatic omission?', 'Optimising your life or improvising it?', 'Legacy or presence?', 'Being understood or being interesting?', 'Certainty about a small thing or doubt about a large one?'],
    C2: ['Moral consistency or moral flexibility in hard cases?', 'A society that is fair but slow, or efficient but unequal?', 'Knowing exactly how you will die, or exactly when?', 'Preserving tradition or accelerating change?', 'Being right in a way nobody accepts, or wrong in a way everybody adopts?', 'Individual autonomy or collective outcome?', 'Fluency without precision, or precision without fluency?', 'Being remembered inaccurately or forgotten completely?']
  },
  chain: {
    A1: ['The', 'My', 'Today', 'I', 'We', 'She'],
    A2: ['Yesterday', 'Last night', 'My friend', 'Before breakfast', 'On the bus', 'After work'],
    B1: ['Suddenly', 'Nobody expected', 'Halfway through', 'Against her advice', 'By the time', 'Somewhere between'],
    B2: ['Apparently', 'What nobody mentioned', 'Having already', 'Despite everything', 'The moment', 'It turned out'],
    C1: ['Precisely because', 'What struck me', 'Had it not', 'In hindsight', 'For reasons nobody', 'Whatever else'],
    C2: ['Notwithstanding', 'That it should ever', 'Whether by design', 'Only in retrospect', 'Improbable as it', 'Insofar as']
  },
};

/* -------------------------------------------------------------
   STAGE 2 — FREE TALK TOPIC BANK
   anchor  = daily life, safe, retrievable
   stretch = unusual / hypothetical, forces spontaneous language
   ------------------------------------------------------------- */

export const TOPICS = {
  A1: {
    anchor: ['Your family', 'Your morning', 'Your home', 'Food you like', 'Your best friend', 'The weather today', 'Your job or your studies', 'Your favourite day of the week'],
    stretch: ['You wake up as a cat for one day', 'A stranger gives you a box — what is inside?', 'You can only eat one food forever', 'Your shoes can talk', 'It rains chocolate today', 'You meet yourself as a child']
  },
  A2: {
    anchor: ['Your last holiday', 'A typical weekend', 'How you get to work', 'A film you watched recently', 'Your neighbourhood', 'Something you bought last month', 'A person you admire', 'Your daily routine'],
    stretch: ['You must live in a supermarket for a week', 'Phones stop working tomorrow', 'You can rewind one hour of yesterday', 'Animals start reviewing humans online', 'You wake up famous but nobody says why', 'You can teleport but only to places you have already been']
  },
  B1: {
    anchor: ['A challenge at work or school', 'How your city has changed', 'A hobby you would recommend', 'A memorable meal', 'Learning something new as an adult', 'A trip that did not go to plan', 'How you use your phone', 'A tradition in your family'],
    stretch: ['Money disappears and everyone trades favours', 'You must explain the internet to someone from 1850', 'You can pause time but you age during the pause', 'Every lie you tell becomes visible on your skin', 'Cities are rebuilt every ten years by law', 'You inherit a house you are not allowed to enter']
  },
  B2: {
    anchor: ['A skill that changed how you work', 'Something you disagree with your colleagues about', 'How you decide what to trust online', 'A time you had to give bad news', 'Balancing work and rest', 'A change in your industry', 'Advice you would give your younger self', 'How your priorities have shifted'],
    stretch: ['Retirement is abolished and everyone works four hours a day forever', 'You are made responsible for one law of physics', 'Memory becomes transferable and sellable', 'Every job interview is replaced by a one-hour conversation with a stranger', 'You must design a country for 500 people', 'Nobody can own land, only borrow it for thirty years']
  },
  C1: {
    anchor: ['A professional decision you still think about', 'What competence looks like in your field', 'How you handle disagreement with someone senior', 'Something your culture does better than others', 'A book or idea that shifted your thinking', 'The gap between how your job looks and how it is', 'Ambition and its costs', 'A risk that was worth taking'],
    stretch: ['Governments are chosen by lottery from the population', 'Expertise expires after five years and must be re-earned', 'You must argue convincingly for a position you find distasteful', 'All art becomes anonymous — no names, ever', 'Children choose which adults raise them at age twelve', 'A machine can predict your regrets with 90% accuracy']
  },
  C2: {
    anchor: ['Where your field is intellectually dishonest with itself', 'What you have stopped being certain about', 'The relationship between craft and speed in your work', 'How institutions you rely on actually make decisions', 'A distinction other people collapse that you keep', 'Judgement versus process', 'The most expensive assumption in your industry', 'How you know when you are wrong'],
    stretch: ['Argue that forgetting is a moral duty', 'Make the strongest possible case against your own profession', 'Consent is renegotiated annually for every relationship, including citizenship', 'Truth becomes verifiable instantly and publicly — describe the collapse', 'Defend inefficiency as a civic good', 'A society decides that no decision may be made faster than a week']
  }
};

/* -------------------------------------------------------------
   STAGE 3 — PRONUNCIATION FALLBACK LISTS
   Used only when Stage 2 harvested nothing (rare, but the trainer
   should never hit a dead end mid-session).
   ------------------------------------------------------------- */

export const PRON_FALLBACK = {
  A1: ['water', 'little', 'better', 'three', 'this', 'work', 'thirty', 'because'],
  A2: ['comfortable', 'vegetables', 'clothes', 'usually', 'February', 'chocolate', 'interesting', 'restaurant'],
  B1: ['probably', 'temperature', 'colleague', 'schedule', 'jewellery', 'particularly', 'photograph', 'analysis'],
  B2: ['inevitably', 'entrepreneur', 'hierarchy', 'anonymous', 'deteriorate', 'infrastructure', 'sophisticated', 'phenomenon'],
  C1: ['unequivocally', 'anaesthetist', 'juxtaposition', 'idiosyncratic', 'quintessential', 'epitome', 'paradigm', 'colloquial'],
  C2: ['otorhinolaryngology', 'antidisestablishment', 'phenomenological', 'incontrovertibly', 'onomatopoeia', 'sesquipedalian', 'archetypal', 'hegemonic']
};

/* -------------------------------------------------------------
   DRILL — WORD FORMS
   answers hold every accepted variant, lowercase.
   ------------------------------------------------------------- */

export const WORD_FORMS = {
  A1: [
    { base: 'play', noun: ['player', 'play'], verb: ['play'], past: ['played'], adjective: ['playing', 'playful'] },
    { base: 'help', noun: ['help', 'helper'], verb: ['help'], past: ['helped'], adjective: ['helping', 'helpful'] },
    { base: 'work', noun: ['work', 'worker'], verb: ['work'], past: ['worked'], adjective: ['working'] },
    { base: 'cook', noun: ['cook', 'cooking'], verb: ['cook'], past: ['cooked'], adjective: ['cooking', 'cooked'] },
    { base: 'clean', noun: ['cleaner', 'cleaning'], verb: ['clean'], past: ['cleaned'], adjective: ['cleaning', 'clean'] },
    { base: 'open', noun: ['opening'], verb: ['open'], past: ['opened'], adjective: ['opening', 'open'] }
  ],
  A2: [
    { base: 'decide', noun: ['decision'], verb: ['decide'], past: ['decided'], adjective: ['deciding', 'decisive'] },
    { base: 'invite', noun: ['invitation'], verb: ['invite'], past: ['invited'], adjective: ['inviting'] },
    { base: 'travel', noun: ['travel', 'traveller', 'traveler'], verb: ['travel'], past: ['travelled', 'traveled'], adjective: ['travelling', 'traveling'] },
    { base: 'excite', noun: ['excitement'], verb: ['excite'], past: ['excited'], adjective: ['exciting', 'excited'] },
    { base: 'agree', noun: ['agreement'], verb: ['agree'], past: ['agreed'], adjective: ['agreeing', 'agreeable'] },
    { base: 'produce', noun: ['production', 'product'], verb: ['produce'], past: ['produced'], adjective: ['producing', 'productive'] }
  ],
  B1: [
    { base: 'destroy', noun: ['destruction'], verb: ['destroy'], past: ['destroyed'], adjective: ['destroying', 'destructive'] },
    { base: 'succeed', noun: ['success'], verb: ['succeed'], past: ['succeeded'], adjective: ['succeeding', 'successful'] },
    { base: 'explain', noun: ['explanation'], verb: ['explain'], past: ['explained'], adjective: ['explaining', 'explanatory'] },
    { base: 'compete', noun: ['competition', 'competitor'], verb: ['compete'], past: ['competed'], adjective: ['competing', 'competitive'] },
    { base: 'depend', noun: ['dependence', 'dependency'], verb: ['depend'], past: ['depended'], adjective: ['depending', 'dependent'] },
    { base: 'persuade', noun: ['persuasion'], verb: ['persuade'], past: ['persuaded'], adjective: ['persuading', 'persuasive'] }
  ],
  B2: [
    { base: 'analyse', noun: ['analysis', 'analyst'], verb: ['analyse', 'analyze'], past: ['analysed', 'analyzed'], adjective: ['analysing', 'analyzing', 'analytical'] },
    { base: 'sustain', noun: ['sustainability', 'sustenance'], verb: ['sustain'], past: ['sustained'], adjective: ['sustaining', 'sustainable'] },
    { base: 'deteriorate', noun: ['deterioration'], verb: ['deteriorate'], past: ['deteriorated'], adjective: ['deteriorating'] },
    { base: 'imply', noun: ['implication'], verb: ['imply'], past: ['implied'], adjective: ['implying', 'implicit'] },
    { base: 'comply', noun: ['compliance'], verb: ['comply'], past: ['complied'], adjective: ['complying', 'compliant'] },
    { base: 'anticipate', noun: ['anticipation'], verb: ['anticipate'], past: ['anticipated'], adjective: ['anticipating', 'anticipatory'] }
  ],
  C1: [
    { base: 'perceive', noun: ['perception'], verb: ['perceive'], past: ['perceived'], adjective: ['perceiving', 'perceptive', 'perceptual'] },
    { base: 'reconcile', noun: ['reconciliation'], verb: ['reconcile'], past: ['reconciled'], adjective: ['reconciling', 'reconcilable'] },
    { base: 'exacerbate', noun: ['exacerbation'], verb: ['exacerbate'], past: ['exacerbated'], adjective: ['exacerbating'] },
    { base: 'substantiate', noun: ['substantiation'], verb: ['substantiate'], past: ['substantiated'], adjective: ['substantiating', 'substantive'] },
    { base: 'differentiate', noun: ['differentiation', 'difference'], verb: ['differentiate'], past: ['differentiated'], adjective: ['differentiating', 'differential'] },
    { base: 'presume', noun: ['presumption'], verb: ['presume'], past: ['presumed'], adjective: ['presuming', 'presumptuous', 'presumptive'] }
  ],
  C2: [
    { base: 'obfuscate', noun: ['obfuscation'], verb: ['obfuscate'], past: ['obfuscated'], adjective: ['obfuscating', 'obfuscatory'] },
    { base: 'promulgate', noun: ['promulgation'], verb: ['promulgate'], past: ['promulgated'], adjective: ['promulgating'] },
    { base: 'attenuate', noun: ['attenuation'], verb: ['attenuate'], past: ['attenuated'], adjective: ['attenuating', 'attenuated'] },
    { base: 'repudiate', noun: ['repudiation'], verb: ['repudiate'], past: ['repudiated'], adjective: ['repudiating', 'repudiatory'] },
    { base: 'countenance', noun: ['countenance'], verb: ['countenance'], past: ['countenanced'], adjective: ['countenancing'] },
    { base: 'circumscribe', noun: ['circumscription'], verb: ['circumscribe'], past: ['circumscribed'], adjective: ['circumscribing', 'circumscribed'] }
  ]
};

/* -------------------------------------------------------------
   DRILL — SENTENCE EXPANSION
   Trainee adds one element at a time: What, When, Where, Why.
   ------------------------------------------------------------- */

export const EXPANSION_STEPS = ['What', 'When', 'Where', 'Why'];

export const EXPANSIONS = {
  A1: [
    { base: 'The dog barked', example: 'The small dog barked loudly this morning in the garden because a cat walked past.' },
    { base: 'She eats', example: 'She eats rice every evening at her mother\'s house because she hates cooking.' },
    { base: 'They ran', example: 'They ran a race last Saturday in the park because their school organised it.' },
    { base: 'I bought a bag', example: 'I bought a red bag yesterday at the market because my old one broke.' }
  ],
  A2: [
    { base: 'The teacher shouted', example: 'The teacher shouted a warning during the exam in the main hall because two students were talking.' },
    { base: 'We waited', example: 'We waited two hours last night outside the station because the train was cancelled.' },
    { base: 'He forgot', example: 'He forgot his passport on Monday morning at home because he packed in a hurry.' },
    { base: 'My phone stopped', example: 'My phone stopped working last week on the bus because it fell in water.' }
  ],
  B1: [
    { base: 'The meeting ended', example: 'The meeting ended without a decision on Friday afternoon in the small conference room because two managers refused to compromise.' },
    { base: 'She apologised', example: 'She apologised publicly the following day at the team briefing because her email had been misread.' },
    { base: 'The system failed', example: 'The system failed completely overnight across all branches because nobody had renewed the licence.' },
    { base: 'They complained', example: 'They complained repeatedly for three weeks at reception because the heating was never fixed.' }
  ],
  B2: [
    { base: 'The proposal collapsed', example: 'The proposal collapsed quietly midway through the quarter inside the finance committee because the projections had been inflated.' },
    { base: 'He resigned', example: 'He resigned without warning on the morning of the launch in front of the whole department because he had been passed over twice.' },
    { base: 'The policy changed', example: 'The policy changed substantially at the start of the year across every regional office because a single audit exposed the gap.' },
    { base: 'Sales dropped', example: 'Sales dropped sharply over the summer in the southern markets because a competitor undercut us on price.' }
  ],
  C1: [
    { base: 'The report was buried', example: 'The report was buried deliberately weeks before publication within the legal department because its findings implicated a senior partner.' },
    { base: 'Confidence eroded', example: 'Confidence eroded steadily throughout the restructuring across the middle management layer because promises were revised three times without explanation.' },
    { base: 'The argument shifted', example: 'The argument shifted decisively in the closing minutes during the parliamentary session because a single document had been leaked.' },
    { base: 'She dissented', example: 'She dissented in writing shortly after the vote before the full board because the process had bypassed consultation entirely.' }
  ],
  C2: [
    { base: 'The consensus fractured', example: 'The consensus fractured irreparably within a fortnight of the ruling across every professional body because the precedent it set was incompatible with existing doctrine.' },
    { base: 'Interest waned', example: 'Interest waned almost imperceptibly over successive funding cycles among the institutional donors because no measurable outcome had ever been defined.' },
    { base: 'The distinction dissolved', example: 'The distinction dissolved entirely once the terminology was standardised in the regulatory literature because both categories now satisfied the same test.' },
    { base: 'Objections were absorbed', example: 'Objections were absorbed silently during the consultation period into an appendix nobody read because the timetable had been fixed in advance.' }
  ]
};

/* -------------------------------------------------------------
   DRILL — PICTURE DESCRIPTION
   Quirky-biased Unsplash queries + level-appropriate follow-ups.
   ------------------------------------------------------------- */

/* Concrete subjects beat abstract adjectives here. Searching
   "surreal" returns mountains; searching "mannequin" returns a
   mannequin. A describable scene with people, objects and something
   happening is what the drill needs — not a moody landscape. */
export const PICTURE_QUERIES = [
  'mannequin', 'garden gnome', 'inflatable costume', 'parade float',
  'carnival ride', 'street performer', 'flea market stall', 'thrift store interior',
  'laundromat', 'vintage arcade', 'roadside diner', 'abandoned amusement park',
  'giant roadside statue', 'strange sculpture', 'unusual door', 'derelict interior',
  'dog wearing clothes', 'crowded market', 'taxidermy', 'junk shop',
  'foggy street at night', 'traffic cone', 'lost shoe on road', 'phone box',
  'car covered in stickers', 'man in costume', 'shop window display', 'roof terrace party'
];

export const PICTURE_PROMPTS = {
  A1: ['What can you see?', 'What colours are there?', 'How many people are there?', 'Is it inside or outside?', 'Do you like it? Why?'],
  A2: ['What is happening right now?', 'What was happening one minute before?', 'Where do you think this is?', 'How does the person feel?', 'What would you do here?'],
  B1: ['What do you think happened just before this photo?', 'What is the story behind it?', 'What is strange about it?', 'How would you describe the atmosphere?', 'Who took this photo and why?'],
  B2: ['What does this image suggest about the place or the people?', 'What is deliberately not shown?', 'How would this photo be read differently in another country?', 'What caption would a newspaper give it?', 'What is the least obvious detail here?'],
  C1: ['What assumption does this image invite you to make, and is it fair?', 'Describe it as a critic, then as a witness.', 'What is the visual tension here?', 'If this image were evidence, what would it prove and fail to prove?', 'What would be lost if this were a video instead?'],
  C2: ['Argue that this image is banal, then argue that it is significant.', 'What ideology could this photograph be used to serve?', 'Describe it without any adjectives, then only with adjectives.', 'What is the relationship between what is framed and what is implied?', 'What would a historian in 200 years misread here?']
};

/* -------------------------------------------------------------
   FILLERS — tap-counted live during Stage 2
   ------------------------------------------------------------- */

export const FILLERS = ['um', 'uh', 'like', 'you know', 'so', 'actually'];

/* -------------------------------------------------------------
   ERROR TYPES — trainer tags each harvested error for trend detection
   ------------------------------------------------------------- */

export const ERROR_TYPES = [
  'Pronunciation',
  'Verb tense',
  'Word order',
  'Article',
  'Preposition',
  'Word choice',
  'Plural / agreement',
  'Missing word',
  'Pausing / hesitation',
  'Other'
];

/* -------------------------------------------------------------
   Helper: pick n random items from an array without repeats
   ------------------------------------------------------------- */
export function sample(arr, n) {
  const copy = (arr || []).slice();
  const out = [];
  while (copy.length && out.length < n) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}

export function pickOne(arr) {
  return (arr || [])[Math.floor(Math.random() * (arr || []).length)];
}

/* Level-safe getter: falls back to B1 if a level key is missing. */
export function forLevel(bank, level) {
  return bank[level] || bank.B1 || [];
}
