---
tags: [product]
---

# Overview

**Skyline Digital** is a marketing website for a digital agency (Tashkent,
Uzbekistan) with one standout feature: visitors can **self-estimate a project's
cost** and receive a personalized commercial proposal as a PDF.

## Goals

1. Present the agency and its services.
2. Show a [[Portfolio]] of real work.
3. Capture leads (contact form + calculator).
4. Let clients estimate cost themselves ([[Calculator Flow]]).
5. Use AI to analyze the request and write a proposal ([[AI Layer]]).
6. Generate a branded PDF proposal ([[PDF Generation]]).
7. Deploy cheaply with minimal infrastructure ([[Deployment]]).

## Non-goals (kept deliberately out of scope)

No auth, no admin panel/CMS, no payments, no client dashboard, no vector DB,
no microservices. Simplicity first — see [[Architecture]].

## Audience

Small/medium businesses in Central Asia evaluating a web, mobile, AI or
automation project. UI is trilingual — see [[i18n]].

## Key principle

The [[Pricing Engine]] computes the number; the [[AI Layer]] only explains it.
This keeps estimates trustworthy and repeatable.

Related: [[Pages and Routes]] · [[Tech Stack]] · [[Design System]]
