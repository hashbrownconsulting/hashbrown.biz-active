---
title: AI Didn't Replace The Thinking This Week. It Replaced The Typing.
slug: ai-replaced-typing-not-thinking
date: 2026-09-12
author: Tom
meta_title: AI Didn't Replace The Thinking This Week. It Replaced The Typing.
description: A week of building with AI coding tools didn't make the work cheaper to think through. It removed the typing. Here is what actually happened, and what still has to come from a person.
excerpt: People assume AI tools mean cutting corners. Here is what a week of building with them actually looked like, and what still has to come from a person.
---

"Vibe coding" gets used as an insult more often than a description. The implication is always the same: you typed a sentence, a model wrote the code, and nobody with judgment was in the room. That is not what the week looked like from here, and the difference is worth being specific about, because it is the entire reason to hire a person instead of just buying a subscription.

## The typing went away. The decisions didn't.

Most of what an AI coding tool actually removes is the boring middle: the boilerplate, the exact syntax for a fix you have made ten times before, the same update typed out across every page on a site. That is real time back. It is also the least valuable part of the job, and it was always the least valuable part of the job. Nobody was ever paying for the keystrokes.

What did not change is the part where you have to know what "correct" looks like before you can ask for it. Run an automated audit on any real site and you get a list of "issues" with severity labels attached. Roughly a third are worth fixing, a third need judgment about whether they even apply to your situation, and a third are actively bad advice for a site your size. Working through that list top to bottom without questioning it is how you "fix" things into a worse product. That triage is not something you can prompt your way past. It is the job.

## A fix that broke a different thing

One real fix this week was for a genuine problem: a site's stylesheet was blocking the page from rendering until it finished downloading, and an audit tool correctly flagged it. The standard fix is to load it without blocking the page, so the browser does not wait on it. That is a real technique, and it worked. The audit went green.

It also introduced a problem no audit tool can catch: the page now painted as plain, unstyled text for a fraction of a second before the design snapped into place, because the browser rendered before the stylesheet had actually arrived. A checklist tool measures what it was built to measure. It does not sit and watch the page load in a real browser and notice it now looks broken for a beat. Catching that, and knowing the actual fix, inlining the small stylesheet instead of reverting the whole change, took someone looking at the result. Not reading the report. Looking at the page.

## The "hack" that was not one

A domain change produced a redirect that looked, for a moment, exactly like a compromised site: rotating destinations, ad tracking parameters on the URL, the whole shape of a hijacked DNS record. The instinct that stops people cold here is panic, and panic gets you either doing nothing or ripping out records that were fine. The actual process was boring on purpose: check the DNS directly against a public resolver, confirm it is clean, connect straight to the real server and skip the browser entirely, narrow the fault down to something local instead of assuming the worst. None of that is a prompt. It is the kind of methodical elimination that only comes from having debugged enough strange internet problems to know panic is never the first move.

> An automated tool tells you what it was built to check for. It never tells you what it missed.

## What this actually changes about the price

None of this makes the thinking cheaper. It changes what the hours go toward. Less of the week goes to typing the same fix five times across five pages. More of it goes to the part that was always the actual job: deciding which of ten recommendations are worth acting on, catching the tradeoff a tool cannot see, staying calm enough to debug the alarming-looking problem instead of reacting to it.

That is also how we build for clients. The tools do the assembly. The judgment about what to build, what to ignore, and what would embarrass you in six months if you shipped it on autopilot still has to come from someone who has done this long enough to know the difference. If you want a system built that way, [book a call](/#contact).
