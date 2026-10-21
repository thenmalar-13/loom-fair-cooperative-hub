# Remix of Loom Together Fairly

Build a complete, polished, functional MVP web application called **SahakarAI — Cooperative Intelligence & Collective Bargaining Platform**.

## Mission
Help traditional handloom weaver cooperatives combine their production capacity, fulfill bulk buyer orders, and negotiate fair prices using three coordinated AI agents.

This must be a working interactive application, not a static landing page or a collection of mockup screens.

## Tech and implementation
- Use React, TypeScript, Tailwind CSS, and reusable components.
- Use the platform's supported default setup.
- For the first version, use deterministic, transparent business logic and realistic seeded sample data. Do not require paid APIs, external AI keys, or a backend to demonstrate the core workflows.
- Keep the architecture ready for future database and AI integrations.
- All primary buttons, filters, forms, tables, and agent actions must work.
- Never claim that simulated agents are real autonomous AI integrations. Clearly label the first version as a simulation-backed MVP.

## Design
Create a premium, professional enterprise SaaS dashboard with a handloom-inspired identity.
Use a warm ivory background, deep indigo navigation, muted teal accents, elegant typography, clear charts, subtle borders, and generous whitespace. Avoid excessive gradients, glowing effects, and generic chatbot styling.

## Main navigation
1. Overview
2. Demand Forecasting
3. Cooperative Capacity
4. Bulk Orders
5. Negotiation Lab
6. Reports

## Seed data
Create 20 fictional weavers from a cooperative in Tamil Nadu. Give each weaver a unique ID, village, textile type, available monthly capacity, production cost per metre, minimum acceptable price per metre, and delivery availability.

Include three textile categories:
- Cotton handloom
- Silk handloom
- Cotton towels

Seed at least three buyer orders with quantities, requested textile types, target prices, and delivery deadlines.

Clearly identify all seed data as fictional demonstration data.

## Agent 1: Forecasting Agent
- Display historical sample demand and forecast demand for each textile category.
- Include a configurable forecast horizon and a chart.
- Implement a transparent baseline forecasting algorithm using the seeded historical data.
- Show forecast quantity, confidence or uncertainty, and the data used.
- Allow the user to modify assumptions and recalculate the forecast.

## Agent 2: Aggregation Agent
- Calculate compatible available capacity across weavers.
- Match buyer orders with weavers who produce the requested textile and can meet the delivery requirements.
- Respect each weaver's available capacity and minimum acceptable price.
- Calculate total production cost, total quantity, average cost, and fulfilment percentage.
- Show exactly which weavers are allocated to each order.
- Prevent over-allocation and prevent combining incompatible textile categories.
- Let the user create an allocation plan and recalculate it after changing capacities or order quantities.

## Agent 3: Negotiation Agent
Build a negotiation simulator with editable buyer offers, cooperative floor prices, and target margins.

For each negotiation:
- Calculate the minimum acceptable cooperative price from the actual production costs and floor-price constraints.
- Propose a counteroffer using a transparent pricing strategy.
- Simulate buyer counteroffers and subsequent negotiation rounds.
- Accept an offer only if it satisfies the applicable minimum price and fulfilment constraints.
- Escalate an offer to a cooperative officer when it falls below the floor price, required terms are infeasible, or a configurable escalation rule is triggered.
- Display the negotiation transcript, current offer, counteroffer, decision explanation, and final status.
- Include Accept, Counteroffer, Reject, and Escalate actions.

The negotiation engine must enforce the floor-price rule in code. Do not let a language model or UI action override it.

## Overview dashboard
Show:
- Registered weavers
- Total available capacity
- Open bulk orders
- Forecast demand
- Projected cooperative revenue
- Projected surplus after production costs

Add an interactive cooperative workflow:
Forecast demand → Aggregate capacity → Match bulk order → Negotiate fair price → Confirm fulfilment.

Show agent activity and explain the decisions in plain English.

## Reports
Provide a report containing order quantity, assigned weavers, production cost, negotiated price, projected surplus, fulfilment status, and escalations.

Add CSV export for the generated report. Label projections as estimates rather than actual financial results.

## Functional acceptance criteria
1. All dashboard pages are navigable.
2. Forecasts recalculate when their inputs change.
3. Capacity allocations update when orders or available capacity change.
4. The application never allocates more than a weaver's available capacity.
5. Negotiations cannot accept prices below the calculated floor price.
6. Escalations are visible and recorded.
7. CSV export produces the current report data.
8. Include loading, empty, validation, and error states where appropriate.
9. Provide a Reset Demo Data action to restore the seeded scenario.
10. The entire core demo works without API keys or paid integrations.

Build the complete application in stages if necessary, but prioritize the working end-to-end workflow and business logic over decorative features. Start by implementing the application structure, seeded data, and interactive dashboard, then complete forecasting, aggregation, negotiation, and reporting. Test the critical calculations and ensure there are no broken primary actions.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://loom-fair-cooperative-hub.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1020cb96-79ed-4ca6-b5db-c18bf37c128c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
