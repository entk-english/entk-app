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
    A1: ['What is your name?', 'How are you today?', 'What colour is your shirt?', 'Do you like coffee or tea?', 'How many brothers and sisters do you have?', 'What did you eat this morning?', 'Where do you live?', 'What day is it today?', 'What is your favourite colour?', 'Do you have a pet?', 'What time do you sleep?', 'Who cooks at home?', 'What is your favourite fruit?', 'Do you like rain?', 'How do you come here?', 'What is your best friend called?', 'Do you play a sport?', 'What did you drink today?', 'Is it hot or cold now?', 'What is in your bag?', 'Do you like music?', 'How many rooms in your home?', 'What day do you like?', 'Do you have a bicycle?', 'What is your street called?', 'Do you watch cartoons?', 'What is your favourite number?', 'Do you like the sea?', 'What colour is your door?', 'Do you drink tea in the morning?'],
    A2: ['What did you do yesterday evening?', 'Who do you live with?', 'What is your favourite food and why?', 'How do you get to work?', 'What time do you usually wake up?', 'What did you watch last week?', 'Do you prefer summer or winter?', 'What are you doing this weekend?', 'What did you buy last?', 'Who called you today?', 'What is your busiest day?', 'Where did you go last weekend?', 'What do you cook best?', 'How long is your journey to work?', 'What did you forget recently?', 'Who makes you laugh?', 'What is on your desk?', 'What do you do after dinner?', 'Where do you shop for food?', 'What did you watch last night?', 'Who do you text most?', 'What is your favourite season?', 'What do you do when you are bored?', 'Where would you go for one day?', 'What is your morning routine?', 'What did you learn this week?', 'Who is the tidiest at home?', 'What is your favourite meal to order?', 'How do you relax after work?', 'What is the last photo you took?'],
    B1: ['What is something you learned recently?', 'Describe your ideal weekend.', 'What annoys you in traffic?', 'Tell me about a place you want to visit.', 'What is a skill you wish you had?', 'What was the last thing that made you laugh?', 'How has your week been so far?', 'What do you usually do to relax?', 'What is a small thing that improved your week?', 'Who taught you something useful?', 'What do you always run out of time for?', 'What is worth paying more for?', 'Describe your street to someone who has never seen it.', 'What is a habit you are proud of?', 'What would you change about your commute?', 'What is the last thing you fixed?', 'What do people ask you for help with?', 'What is your most used app and why?', 'What is a rule you follow that others do not?', 'What did you nearly buy but did not?', 'What is the best advice you gave recently?', 'Where do you go to think?', 'What is your favourite thing to cook for others?', 'What is something you avoid doing?', 'What is a skill you use every day?', 'Who do you go to with bad news?', 'What is your ideal Sunday?', 'What do you notice first about a place?', 'What is your favourite kind of weather to work in?', 'What did you say no to recently?'],
    B2: ['What is a habit you would like to break?', 'Describe a decision you regret slightly.', 'What is overrated in your opinion?', 'How do you deal with a stressful day?', 'What is something people misunderstand about your job?', 'Tell me about a time you changed your mind.', 'What do you think you will be doing in five years?', 'What is the best advice you have ignored?', 'What is a compromise you have made at work?', 'What do you defend that colleagues question?', 'Where are you unusually patient?', 'What is a decision you keep postponing?', 'What have you changed your mind about this year?', 'What is the hardest part of your job to explain?', 'Who has influenced how you work?', 'What would you delegate if you could?', 'What is a problem you enjoy solving?', 'What signals to you that something is going wrong?', 'What is worth doing slowly?', 'What do you wish you had learned earlier?', 'What is a criticism you have accepted?', 'Where do you overprepare?', 'What is a professional habit you would recommend?', 'When do you trust instinct over data?', 'What would your colleagues say you are strict about?', 'What is the last thing you rewrote completely?', 'What do you find draining that others find easy?', 'What would you do with an extra hour daily?', 'What is a small win from this month?', 'What have you stopped apologising for?'],
    C1: ['What is a belief you held strongly that you no longer hold?', 'Where do you think you are unusually stubborn?', 'What is a trend you refuse to follow?', 'Describe something you find beautiful that others find boring.', 'What would you do differently if nobody was watching?', 'What is a compliment you struggle to accept?', 'Which of your opinions would surprise your friends?', 'What is something you are quietly proud of?', 'Where does your field reward the wrong behaviour?', 'What do you know that you cannot easily prove?', 'What is a nuance outsiders always miss?', 'What is a position you hold reluctantly?', 'When has being wrong served you well?', 'What is a distinction you insist on?', 'Where do you tolerate ambiguity?', 'What would you refuse to compromise on?', 'What is your relationship with deadlines?', 'What have you unlearned professionally?', 'What is a fashionable idea you distrust?', 'Where are you deliberately inconsistent?', 'What is a risk you would take again?', 'Whose judgement do you defer to and why?', 'What is the most useful criticism you have received?', 'What is over-measured in your work?', 'Where does convention still make sense?', 'What would you tell someone entering your field?', 'What is a question you cannot answer briefly?', 'What do you protect your attention from?', 'Where does your confidence outrun your evidence?', 'What is worth being unpopular for?'],
    C2: ['What idea have you not been able to argue yourself out of?', 'Where does your intuition consistently outperform your reasoning?', 'What do you think your generation gets systematically wrong?', 'Describe a contradiction you live with comfortably.', 'What is the most useful thing you have unlearned?', 'Which of your certainties is probably a habit?', 'What would you defend even if it made you unpopular?', 'What question do you wish people asked you?', 'What premise in your field goes unexamined?', 'Where does rigour become theatre?', 'What have you learned from being misread?', 'What would falsify a belief you hold?', 'Where is consensus doing the work of thought?', 'What is a productive disagreement you sustain?', 'What does your work assume about people?', 'Where have you mistaken fluency for understanding?', 'What would you argue against your own interest?', 'What is the cost of the clarity you prefer?', 'Where does precision mislead?', 'What do you suspect but cannot yet defend?', 'Where is your expertise least transferable?', 'What would a sceptic say about your method?', 'What do you find beautiful in your discipline?', 'Where should judgement replace process?', 'What would you need to see to change course?', 'What are you still curious about after all this time?', 'What question would you put to your younger self?', 'Where does your field confuse cause and correlation?', 'What has repetition taught you that novelty did not?', 'What is a distinction you have abandoned?', ]
  },
  thisOrThat: {
    A1: ['Tea or coffee?', 'Cat or dog?', 'Morning or night?', 'Pizza or rice?', 'Bus or walk?', 'Red or blue?', 'Hot or cold?', 'Book or TV?', 'Apple or banana?', 'Car or bus?', 'Sun or moon?', 'Water or juice?', 'Blue or green?', 'Big city or small town?', 'Chicken or fish?', 'Run or walk?', 'Summer or winter?', 'Bread or rice?', 'Phone or TV?', 'Park or beach?', 'Milk or water?', 'Shoes or sandals?', 'Sing or dance?'],
    A2: ['Cooking at home or eating out?', 'Beach holiday or city holiday?', 'Text message or phone call?', 'Early bird or night owl?', 'Big party or small dinner?', 'Music or silence while working?', 'Plan everything or decide later?', 'Shower in the morning or at night?', 'Window seat or aisle?', 'Cash or card?', 'Films at home or cinema?', 'Coffee shop or library?', 'Long walk or short run?', 'Cook or order in?', 'Morning gym or evening gym?', 'Books or podcasts?', 'Save or spend?', 'City break or countryside?', 'Handwritten notes or typed?', 'Take photos or just look?', 'Plan the trip or improvise?', 'Big breakfast or big dinner?', 'Early flight or late flight?'],
    B1: ['Working alone or in a team?', 'Saving money or spending on experiences?', 'Reading the book or watching the film?', 'A job you love with low pay, or a boring job with high pay?', 'Living in the city centre or the suburbs?', 'Learning fast and forgetting, or learning slowly and keeping it?', 'Being early or being relaxed?', 'Honest feedback or gentle feedback?', 'Feedback in writing or in person?', 'Work from home or from an office?', 'Deep focus or fast variety?', 'Fix it yourself or call someone?', 'Be busy or be bored?', 'Detailed plan or rough direction?', 'Small team or large team?', 'Learn by doing or by reading?', 'Routine or novelty?', 'Say it now or say it later?', 'Free time or extra pay?', 'Lead the project or support it?', 'Public praise or private thanks?', 'Move often or stay put?', 'Specialise or generalise?'],
    B2: ['Being respected or being liked?', 'Total freedom with no security, or full security with no freedom?', 'Knowing the truth or keeping the illusion?', 'Depth in one field or range across many?', 'A short intense career or a long steady one?', 'Being underestimated or being overestimated?', 'Making the decision or living with someone else\'s?', 'Public failure or private stagnation?', 'Speed or certainty?', 'Autonomy or support?', 'Be challenged or be trusted?', 'A hard truth or a kind delay?', 'Consensus or a clear decision?', 'Prevent the problem or solve it well?', 'Reputation or freedom?', 'Mentor others or be mentored?', 'A stable role or a growing one?', 'Own the risk or share it?', 'Ask forgiveness or permission?', 'Depth of relationship or breadth of network?', 'Improve the weakness or double the strength?', 'Transparency or discretion?', 'Perfect later or good now?'],
    C1: ['Being irreplaceable or being free to leave?', 'A life of comfort or a life of meaning that costs you?', 'Being the smartest in the room or the least experienced?', 'Radical honesty or diplomatic omission?', 'Optimising your life or improvising it?', 'Legacy or presence?', 'Being understood or being interesting?', 'Certainty about a small thing or doubt about a large one?', 'Principle or outcome?', 'Be understood or be precise?', 'Institutional memory or fresh eyes?', 'Slow consensus or fast reversal?', 'Credit or influence?', 'Be indispensable or be replaceable?', 'Optimise the system or the individual?', 'Fewer better decisions or more reversible ones?', 'Explain or demonstrate?', 'Standardise or tailor?', 'Hold the line or read the room?', 'Legacy systems or rebuild?', 'Comfort of certainty or value of doubt?', 'Reward effort or results?', 'Be early and wrong or late and right?'],
    C2: ['Moral consistency or moral flexibility in hard cases?', 'A society that is fair but slow, or efficient but unequal?', 'Knowing exactly how you will die, or exactly when?', 'Preserving tradition or accelerating change?', 'Being right in a way nobody accepts, or wrong in a way everybody adopts?', 'Individual autonomy or collective outcome?', 'Fluency without precision, or precision without fluency?', 'Being remembered inaccurately or forgotten completely?', 'Justice or mercy in a hard case?', 'Procedural fairness or substantive fairness?', 'Liberty with risk or safety with constraint?', 'Truth that harms or silence that protects?', 'Efficiency or resilience?', 'Merit or need?', 'Continuity or renewal?', 'Individual judgement or codified rule?', 'Transparency or confidentiality in governance?', 'Preserve or adapt?', 'Universal principle or contextual judgement?', 'Consent or consequence?', 'Expert authority or democratic mandate?', 'Precaution or experimentation?', 'The measurable or the meaningful?']
  },
  chain: {
    A1: ['The', 'My', 'Today', 'I', 'We', 'She', 'He', 'They', 'It', 'Yesterday', 'Every day', 'At home', 'In the morning', 'My mother', 'The cat', 'Our teacher'],
    A2: ['Yesterday', 'Last night', 'My friend', 'Before breakfast', 'On the bus', 'After work', 'Later that day', 'On the way home', 'Just before', 'My neighbour', 'That evening', 'Somewhere near', 'Once a week', 'The old man', 'Behind the shop', 'After lunch'],
    B1: ['Suddenly', 'Nobody expected', 'Halfway through', 'Against her advice', 'By the time', 'Somewhere between', 'Without warning', 'Much later', 'As usual', 'The strangest part', 'Nobody noticed', 'Right after', 'A week earlier', 'What surprised everyone', 'Just outside', 'The following morning'],
    B2: ['Apparently', 'What nobody mentioned', 'Having already', 'Despite everything', 'The moment', 'It turned out', 'Curiously enough', 'By the time anyone', 'Having said that', 'Against all expectation', 'What had begun as', 'Only afterwards', 'Somewhere in between', 'For once', 'The moment it became', 'Nobody had thought'],
    C1: ['Precisely because', 'What struck me', 'Had it not', 'In hindsight', 'For reasons nobody', 'Whatever else', 'In retrospect', 'What nobody had anticipated', 'Had circumstances differed', 'So thoroughly had', 'Whatever the intention', 'Precisely when', 'Long before anyone', 'It emerged that', 'For all its promise', 'By any measure'],
    C2: ['Notwithstanding', 'That it should ever', 'Whether by design', 'Only in retrospect', 'Improbable as it', 'Insofar as', 'Inasmuch as', 'That it had ever', 'Were one to suppose', 'However improbable', 'Not least because', 'Scarcely had', 'To the extent that', 'What passes for', 'Whether by accident', 'Only later did']
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
   DRILL — CONNECTOR CHAINING

   The complaint this answers: beginners produce three short stumps
   where one linked idea belongs. "Man found stick. Man hit with stick.
   Man happy." Every stump is grammatical and the whole thing is
   unusable. Forcing a connector forces the relationship between the
   ideas to be stated, which is the thing that was missing.

   The connectors are tiered because "in spite of" at A1 is a party
   trick, not a skill; and "and" at C1 is not worth marking.
   ------------------------------------------------------------- */

export const CONNECTORS = {
  A1: ['and', 'but', 'so', 'because', 'then'],
  A2: ['but', 'so', 'because', 'after that', 'that is why'],
  B1: ['so', 'but', 'because', 'although', 'however', 'therefore'],
  B2: ['however', 'therefore', 'although', 'despite', 'as a result', 'whereas'],
  C1: ['thus', 'hence', 'nevertheless', 'in spite of', 'consequently', 'whereas'],
  C2: ['hence', 'conversely', 'albeit', 'notwithstanding', 'thereby', 'insofar as']
};

export const CONNECTOR_PROMPTS = {
  A1: [
    'You were late this morning. Say what happened.',
    'You did not eat breakfast. Say why.',
    'You liked a film. Say why.',
    'You were tired last night. Say what you did.',
    'You bought something new. Say why.'
  ],
  A2: [
    'Your bus did not come. Say what you did next.',
    'You changed your plan for the weekend. Say why.',
    'You do not use one app any more. Say what happened.',
    'You learned something the hard way. Tell it.',
    'You said no to an invitation. Say why.'
  ],
  B1: [
    'You disagreed with a decision at work or school. What happened?',
    'Something cheap turned out to be expensive in the end. Tell it.',
    'You changed your mind about a person or a place. Why?',
    'A plan worked, but not the way you expected.',
    'You had to choose between two good options.'
  ],
  B2: [
    'A rule that exists for a good reason produced a bad result. Tell it.',
    'You were right, but arguing it would have cost more than it was worth.',
    'Something popular is, in your view, overrated. Make the case.',
    'A small decision turned out to matter more than a big one.',
    'You were persuaded out of a position you had held for years.'
  ],
  C1: [
    'A policy achieved its stated aim and made things worse. Explain.',
    'Two things you believe are in tension with each other. Hold both.',
    'Defend a position you do not personally hold.',
    'Something you were trained to do is now obsolete. What replaced it?',
    'An exception that does not disprove the rule, and why.'
  ],
  C2: [
    'A distinction that everyone draws and almost nobody can define.',
    'Concede your opponent’s strongest point, then win anyway.',
    'A field improved by abandoning its founding assumption.',
    'The cost of being consistent, in a case where you paid it.',
    'Something true, unfalsifiable, and therefore useless. Untangle it.'
  ]
};

/* -------------------------------------------------------------
   DRILL — PREP

   Point, Reason, Example, Point again. A shape for an answer, so a
   trainee who knows the words still has somewhere to put them. The
   second Point is not padding: rephrasing it is where a learner
   discovers whether they actually made one.
   ------------------------------------------------------------- */

export const PREP_STEPS = [
  ['point', 'Point', 'Say it in one sentence.'],
  ['reason', 'Reason', 'Why? One reason, or two.'],
  ['example', 'Example', 'One real example — something that happened.'],
  ['restate', 'Point again', 'Say the point again, in different words.']
];

export const PREP_QUESTIONS = {
  A1: [
    'What is the best day of the week?',
    'Is it better to live in a city or a village?',
    'Should children have phones?',
    'What is the best food for breakfast?',
    'Is it better to walk or to drive?'
  ],
  A2: [
    'Why do you think you need a better salary?',
    'Should school start later in the morning?',
    'Is it better to travel alone or with friends?',
    'Should everyone learn to cook?',
    'Is it better to rent or to buy?'
  ],
  B1: [
    'Why do you think you deserve a promotion?',
    'Should companies allow working from home?',
    'Is social media good for young people?',
    'Should university be free?',
    'Is it better to specialise or to be a generalist?'
  ],
  B2: [
    'Should employers be allowed to monitor staff?',
    'Is failure a better teacher than success?',
    'Should voting be compulsory?',
    'Does remote work damage a career?',
    'Is expertise being devalued?'
  ],
  C1: [
    'Should AI-written work be labelled as such?',
    'Is meritocracy a coherent idea?',
    'Should there be a limit on inherited wealth?',
    'Does transparency always improve an institution?',
    'Is optimism a strategy or a temperament?'
  ],
  C2: [
    'Is scientific consensus an argument or an authority?',
    'Should a democracy be able to vote away its own protections?',
    'Is moral progress a real phenomenon or a narrative device?',
    'Does regulation of a technology arrive too late by definition?',
    'Is disagreement between experts evidence of anything?'
  ]
};

/* -------------------------------------------------------------
   DRILL — THE FORBIDDEN WORD

   The trainee gets a word and describes it until the trainer guesses
   it, without ever saying it — or the near-miss words listed with it.
   It is a vocabulary drill wearing a game's clothes: the point is the
   circumlocution, which is exactly what a learner does in real life
   when the word will not come.
   ------------------------------------------------------------- */

export const FORBIDDEN_WORDS = {
  A1: [
    { word: 'umbrella', banned: ['rain', 'wet'] },
    { word: 'kitchen', banned: ['cook', 'food'] },
    { word: 'bicycle', banned: ['ride', 'wheels'] },
    { word: 'teacher', banned: ['school', 'class'] },
    { word: 'winter', banned: ['cold', 'snow'] },
    { word: 'shoes', banned: ['feet', 'wear'] }
  ],
  A2: [
    { word: 'passport', banned: ['travel', 'country'] },
    { word: 'neighbour', banned: ['next', 'house'] },
    { word: 'receipt', banned: ['shop', 'pay'] },
    { word: 'alarm clock', banned: ['wake', 'morning'] },
    { word: 'suitcase', banned: ['travel', 'clothes'] },
    { word: 'library', banned: ['book', 'read'] }
  ],
  B1: [
    { word: 'deadline', banned: ['time', 'finish'] },
    { word: 'landlord', banned: ['rent', 'flat'] },
    { word: 'interview', banned: ['job', 'questions'] },
    { word: 'insurance', banned: ['pay', 'accident'] },
    { word: 'commute', banned: ['work', 'travel'] },
    { word: 'refund', banned: ['money', 'back'] }
  ],
  B2: [
    { word: 'bureaucracy', banned: ['government', 'forms'] },
    { word: 'burnout', banned: ['work', 'tired'] },
    { word: 'compromise', banned: ['agree', 'middle'] },
    { word: 'reputation', banned: ['people', 'think'] },
    { word: 'loophole', banned: ['law', 'escape'] },
    { word: 'shortlist', banned: ['job', 'candidates'] }
  ],
  C1: [
    { word: 'nostalgia', banned: ['past', 'memory'] },
    { word: 'precedent', banned: ['law', 'before'] },
    { word: 'scapegoat', banned: ['blame', 'fault'] },
    { word: 'threshold', banned: ['limit', 'door'] },
    { word: 'incentive', banned: ['money', 'reward'] },
    { word: 'stalemate', banned: ['chess', 'stuck'] }
  ],
  C2: [
    { word: 'plausible deniability', banned: ['lie', 'blame'] },
    { word: 'diminishing returns', banned: ['less', 'effort'] },
    { word: 'survivorship bias', banned: ['success', 'data'] },
    { word: 'moral hazard', banned: ['risk', 'insurance'] },
    { word: 'false equivalence', banned: ['same', 'compare'] },
    { word: 'institutional inertia', banned: ['slow', 'change'] }
  ]
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
