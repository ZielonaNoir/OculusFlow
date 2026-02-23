---
name: designing-ecommerce-ops-agents
description: Use when designing or implementing AI workflows that act as dynamic operations agents (e.g., Host Scheduling, Campaign Monitoring) which require processing time-series data, ROI thresholds, and real-time business decision making.
---

# Designing E-commerce Operations Agents

## Overview

Unlike content generation agents (which focus on text and visual creativity), **Operations Agents** (Ops Agents) act as algorithmic decision-makers. They replace manual, repetitive monitoring and scheduling tasks (like staring at ad dashboards or arranging streamer shifts) with 24/7 automated logic. These agents handle quantitative data, time constraints, and threshold-based triggers.

## Core Characteristics of Ops Agents

1.  **Data-Driven Input**: Instead of natural language prompts, their primary inputs are structured JSON payloads containing metrics (ROI, CPC, CTR, Conversion Rate) or profiles (Streamer historical performance, audience demographics).
2.  **Stateful or Time-Aware Context**: They need to know the "current state" (e.g., "It is currently 3:00 AM, the budget is 80% consumed").
3.  **Deterministic Actions**: Their output often triggers actual system changes (e.g., `pause_campaign`, `assign_shift`, `adjust_bid`), rather than just generating readable text.
4.  **Threshold & Circuit Breakers**: They must have hardcoded or dynamic safety nets. If an AI decides to increase ad spend by 500% due to a hallucination, the system must block it.

## Key Ops Agent Archetypes

### 1. The Host Scheduling Agent (主播排班智能体)

**Problem**: Assigning the right host to the right time slot to maximize overall GMV. High-converting hosts should be placed in peak traffic hours; newer hosts in long-tail hours.
**Workflow**:

- **Input**: `Array<StreamerProfile>` (including unit price, historic conversion rate, stamina maximum hours) + `TrafficForecast` (hourly predicted viewership).
- **Processing**: The AI acts as a constraint satisfaction solver. It looks for the optimal mapping of `Streamer -> TimeSlot` while respecting constraints (e.g., max 4 hours per streamer).
- **Output**: A structured schedule (`TimeSlot[]`) with explicit rationale ("Assigned Host A to 20:00 because her conversion rate peaks during evening family-oriented traffic").

### 2. The Campaign Monitor Agent (AI 投流盯盘智能体)

**Problem**: Human media buyers cannot monitor ad accounts 24/7. Campaigns often "run away" (spend budget without conversions) during the night.
**Workflow**:

- **Input**: Real-time or aggregated tick data of campaign performance (`Spend`, `Clicks`, `Purchases`, `ROI`).
- **Processing**: Running a continuous loop (or cron job). Comparing current metrics against target KPIs and historical baselines.
- **Action Matrix**:
  - _If ROI > Target_: Scale budget (within safety limits).
  - _If Cost-Per-Click spikes & Conversion drops_: Flag anomaly.
  - _If Spend hits soft cap with zero sales_: Trigger **Circuit Breaker** (Pause Campaign).
- **Output**: An actionable log stream (e.g., "11:45 PM - Campaign 'Winter Sale' paused due to CPA exceeding threshold by 150%").

## Implementation Best Practices

### The "Illusion of Real-Time" for Interfaces

When building user interfaces for these agents, especially in prototype or demonstration phases where real data streams might be absent:

1.  **Metric Tickers**: Use React/Framer Motion to create visual tickers that simulate changing data points.
2.  **Streaming Logs**: Rather than showing a static result, render the AI's "thought process" and "actions" as a scrolling terminal-like log. This builds trust by showing _why_ the AI made a decision, not just the final outcome.
3.  **Mock Data Generators**: Use JavaScript functions to generate realistic noise around a baseline trend (e.g., `baseline_cpc + Math.random() * variance`) to simulate live data flow into the agent's logic.

### Prompt Engineering for Ops Agents

Ops Agent prompts must be highly constrained. Avoid asking for "general advice".

**Bad Prompt**:

> "Look at this ad data and tell me what to do with the budget."

**Good Prompt**:

> "You are an automated media buying script. Analyze the provided JSON array of hourly ad performance.
> Goal: Maximize ROI while keeping CPA under $15.
> Constraint 1: Do not increase budget by more than 20% in a single step.
> Constraint 2: If CPA exceeds $25 for two consecutive hours, output 'ACTION: PAUSE'.
> Output your decision in strict JSON: { 'action': 'SCALE' | 'PAUSE' | 'HOLD', 'reasoning': string, 'newBudget': number }."
