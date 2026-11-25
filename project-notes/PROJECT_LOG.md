# Project log

**Team name:** Caleb Roll
**Startup name:** Føre
**Live site link:** https://x2024cnf.github.io/F-re/

> Note: I didn't keep this log or commit my work regularly at first. 
> Sessions 1–2 and the Nov 10 and Nov 16 notes were written on Nov 23 
> from my commit history and my notes, which is why my commits jump from 
> Nov 2 to Nov 23. From Session 3 on, I'm writing in the log and 
> committing every time I work on it.
>
> How I used AI: Copilot wrote the code. I used Claude to brainstorm 
> ideas, get feedback on my site, help word some of my Copilot prompts, 
> and help expand my reflection drafts. I decided what to build and 
> tested every change myself.

---

## Work sessions

### Session 1 — Nov 2 — driver: Caleb

- **Goal for this session:** Pick my startup idea and build the first version of the site in the class lab.
- **Key prompts we gave Copilot** (paste the important ones):
  1. "Build a mobile-friendly prototype website for a fictional startup called 'Føre'... plain HTML, CSS, and JavaScript only... Each run gets a 'Chatter Score' from 0 to 100... a Network page with a slider for active riders that shows runs covered, accuracy and data age."
  2. "Upgrade the Føre prototype so each resort behaves like a real Rocky Mountain ski area... realistic elevations, run aspects and steepness... a 'Ride the day' time slider from 8:30 am to 4:00 pm... a 'Why?' line explaining each run's condition."
- **What worked:** I got a first version with Home, Snow map, Report and Network pages. Moving the rider slider showed the app getting better with more users. After the second prompt, each resort had real-looking stats, weather, and conditions that changed through the day.
- **What broke, and how we fixed it:** The numbers didn't match between pages. One page said 12 runs and another said 86. Also, the weather showed a sun icon even when it said "Snowing."
- **Committed?** yes — commit message: "Initial commit" + first build commit

### Session 2 — Nov 2 (evening) — driver: Caleb

- **Goal for this session:** Make the site look better and add pages that show the business side.
- **Key prompts we gave Copilot** (paste the important ones):
  1. "Give the Føre site a bold, premium visual redesign while keeping all existing features working..."
  2. "Console error: Cannot set properties of null at renderResortSpecs (app.js:285)... fix it so one page's code can't break the others."
- **What worked:** The new design looked a lot better: a dark night-sky background with mountains and falling snow at the top of the home page, a new logo, and a dial showing each run's Chatter Score. Added For Resorts, Pricing and Rider Profile pages.
- **What broke, and how we fixed it:** After the redesign, nothing worked anymore. The runs disappeared from the map and the resort menu and sliders did nothing. I opened the browser's error log (F12) and found one error. The code for the snow map was running on every page, even pages without a map, and when it couldn't find the map it crashed and stopped everything else from loading. Copilot fixed it so each page only runs its own code, and put all the numbers in one file so they match everywhere.
- **Committed?** no — I didn't know I was supposed to commit yet.

**Nov 10:** Tried to fix the snow map (the runs were straight lines like a barcode and the names were stacked on top of each other), but I hit my free Copilot monthly limit, so nothing got changed.

**Nov 16:** No coding. My GitHub Education got approved (it took 3 days for the student Copilot to unlock) and I planned out the rest of the project.

### Session 3 — Nov 23 — driver: Caleb

- **Goal for this session:** Fix everything still broken and make the mountain maps look like real ski maps.
- **Key prompts we gave Copilot** (paste the important ones):
  1. "Please DON'T rebuild it from scratch... the trail map looks like a barcode... numbers didn't match... the data age bar should shrink as riders go up..."
  2. "The labels keep overlapping. Remove the name labels from the map. Put a small numbered circle (1–12) on each run... add a Runs list under the map..."
  3. "Every run funnels into one single point at the bottom... spread the run endings out... make the lifts look like real chairlifts..."
- **What worked:** Switching resorts, the rider slider, real province names (Alberta / British Columbia), pages opening at the top, each resort getting its own snow rating, and numbered runs with a clickable list. Turned on GitHub Pages so the site is live.
- **What broke, and how we fixed it:** The map took a lot of tries. First the run names covered the runs, then they all piled up in the middle, then every run squeezed into one point at the bottom. Swapping the names for numbered circles plus a list underneath fixed it. Copilot also gave me an error saying it couldn't save changes to app.js because two of its edits happened at the same time. An extra copy of a file called "app.js Fore" kept making a Save As box pop up, so I closed it without saving and deleted it. I also realized I'd only committed twice the whole project, so I committed everything.
- **Committed?** yes — commit message: "Map runs, chairlifts, snow caps, region names, verdict fixes"

### Session 4 — Nov 25 — driver: Caleb

- **Goal for this session:** Write the business case and finish the project log.
- **Key prompts we gave Copilot** (paste the important ones):
  1. None. This session was writing, not coding.
- **What worked:** Talked through each business case section by answering guiding questions, then reworded the whole thing in my own words. Finished the "What a real version would need" table and the reflection.
- **What broke, and how we fixed it:** My first project log didn't save, so I had to paste it back in. My first business case draft didn't sound like me, so I rewrote it myself.
- **Committed?** yes — commit message: "Wrote business case and finished project log"

---

## Things that broke (running list)

| Date | What went wrong | What we tried | What finally fixed it |
|---|---|---|---|
| Nov 2 | The numbers didn't match between pages | Fixing each page one by one | Putting all the numbers in one shared file |
| Nov 2 | After the redesign the map, resort menu and sliders stopped working | Looking around the page for the problem | Found the error in the browser's error log (F12). Map code was crashing on pages without a map, so each page now only runs its own code |
| Nov 10 | Map runs looked like a barcode with names stacked on top | Asking Copilot to make it "look like a trail map" | Telling it exactly where the peaks, lifts and runs go (finished Nov 23) |
| Nov 10 | Hit my free Copilot monthly limit | Waiting | Applied for GitHub Education; approved Nov 16, unlocked 3 days later |
| Nov 23 | Run names overlapped and piled up on the map | Asking Copilot to move them (made it worse twice) | Swapped names for numbered circles and a list under the map |
| Nov 23 | Every run ended at the same point at the bottom | — | Spread the run endings across the bottom of the mountain |
| Nov 23 | A Save As box kept popping up | Pressing save again | It was an extra copy of a file; closed it without saving and deleted it |
| Nov 23 | Only 2 commits in 3 weeks, so my work wasn't backed up | — | Committed everything; now I commit every time I work on it |
| Nov 25 | My project log didn't save | — | Pasted it back in, saved, and committed right away |

## What a real version would need

| Feature we faked or skipped | Why a real company would need it | How hard / expensive? |
|---|---|---|
| Rider accounts and logins | Each rider needs their own reports, history and Trusted reporter status | Medium: use a ready-made login service, a few hundred dollars a month at scale |
| Shared database for reports | Right now reports only save in one browser, so other riders never see them | Medium: a hosted database plus a developer to connect it |
| Phone app that senses the ride | The whole idea depends on reading the phone's motion sensors while you ride, which a website can't do. The sensors already exist in every phone, and running and ski-tracking apps already use them for speed and distance | High: an iPhone and Android app that records rides in the background and saves them when there's no signal, months of developer time |
| Snow-detection system (Chatter Score) | The scores on my site are made up. Turning ride vibrations into "icy / powder / crud" is the new part that doesn't exist yet, similar to how phone sensors have been used to detect potholes on roads | High: needs a season or two of rider taps to train it, plus someone who builds these systems. This training data is also what makes Føre hard to copy |
| Live weather and grooming data | The site only has three pretend weather days; riders need today's real conditions | Medium: paid weather data, plus deals with resorts to share grooming reports |
| Payments for Føre+ and resort plans | The subscription and resort plan buttons don't do anything | Low to medium: a payment company handles it, but takes a cut of every sale |
| Stopping fake or spam reports | Anyone could tap "powder" on an icy run and mislead people | Medium: give trusted reporters more weight, flag reports that disagree with everyone else |
| Protecting riders' location data | The app knows where riders are and when, which could be misused if leaked | Medium to high: security, privacy rules, and letting riders choose what's shared |

## Reflection

1. **What surprised you most about building software with AI?**

What surprised me most was how it responds to the questions itself. Copilot would explain what it changed, ask what I wanted next, and tell me what to test, almost like working with a person. I was also surprised by how fast you can turn an idea into a functional website. In one afternoon on Nov 2, I went from just an idea to a working site with a snow map, a rider slider and multiple pages. But it also surprised me how easily it could break. One redesign prompt made the whole site stop working, and if I hadn't checked the error log I wouldn't have known why.

2. **Which parts were easy, and which were hard? Why do you think that is?**

What was easy was getting Copilot to turn my prompt ideas into working pages, buttons and designs. Most of that worked on the first or second try. What was hard was getting it to accurately display a mountain. That took about 10–15 prompt attempts just to properly shape it without sacrificing the lines for the slopes and turning it into a big sloppy mess. I think normal website parts are easy because the AI has seen them thousands of times, but drawing something precise like a trail map is harder for it. It only started working when I got really specific, like telling it exactly where the peaks and lifts go and switching the run names to numbered circles. Vague prompts like "make it look like a ski map" didn't work.

3. **If a competitor had the same AI tool, how long would it take them to copy your site?**

My website is very easy to copy. I built it in about three weeks with no coding background, so someone with the same AI tool could probably copy it in a weekend. What's hard to imitate is the user base Føre creates and the snow data those users make. Føre would start small on a local scale at maybe 1–2 ski resorts, so there are enough riders on each hill for the scores to be accurate, then expand as more riders join. Every ride and report teaches Føre what ice and powder actually feel like, and a new competitor would start with none of that data and an empty map. That creates network barriers to entry. The business lesson for me is that when AI makes software this cheap and fast to build, a startup's advantage can't be the app itself. It has to be something AI can't copy, like users, data and partnerships.
