# Velocity Mixpanel Dashboard Setup Guide

This guide provides instructions for setting up comprehensive Mixpanel dashboards to analyze user behavior and conversion funnels for the Velocity website and extension.

## Dashboard 1: Acquisition Metrics

### Overview Report
- **Report Type**: Number
- **Metric**: Total unique users
- **Filter**: Event = "Visit Website"
- **Time Range**: Last 30 days

### Traffic Sources Report
- **Report Type**: Pie Chart
- **Event**: "Visit Website"
- **Group By**: "source_origin"
- **Metric**: Unique users
- **Time Range**: Last 30 days

### Landing Page Performance
- **Report Type**: Table
- **Event**: "Visit Website"
- **Group By**: "page"
- **Metrics**: Total events, Unique users, Conversion rate to "Click Get Started" or "Click Try For Free"
- **Time Range**: Last 30 days

### Button Click Rates
- **Report Type**: Bar Chart
- **Event**: "Button Clicked"
- **Group By**: "buttonName"
- **Metric**: Total events
- **Time Range**: Last 30 days

### Acquisition Funnel
- **Report Type**: Funnel
- **Steps**:
  1. "Visit Website"
  2. "Button Clicked" where "buttonName" equals "Get Started" or "Try for Free"
  3. "Redirected to Register"
  4. "Register Success"
- **Time Range**: Last 30 days
- **Group By**: "flow" (for A/B testing comparison)

### Campaign Performance
- **Report Type**: Table
- **Event**: "Visit Website"
- **Group By**: "utm_campaign"
- **Metrics**: Unique users, Conversion rate to "Register Success"
- **Time Range**: Last 30 days

## Dashboard 2: Engagement Metrics

### Extension Usage Overview
- **Report Type**: Number
- **Metric**: Total events
- **Filter**: Event = "Extension Opened"
- **Time Range**: Last 30 days

### Prompt Activity
- **Report Type**: Line Chart
- **Event**: "Prompt Typed"
- **Metric**: Total events
- **Time Range**: Last 30 days
- **Interval**: Daily

### Average Prompt Length
- **Report Type**: Number
- **Event**: "Prompt Typed"
- **Metric**: Average of "prompt_length"
- **Time Range**: Last 30 days

### Button Usage in LLMs
- **Report Type**: Bar Chart
- **Event**: "Button Used in LLM"
- **Group By**: "button_name"
- **Metric**: Total events
- **Time Range**: Last 30 days

### LLM Platform Distribution
- **Report Type**: Pie Chart
- **Event**: "Button Used in LLM"
- **Group By**: "llm_platform"
- **Metric**: Total events
- **Time Range**: Last 30 days

### Engagement Funnel
- **Report Type**: Funnel
- **Steps**:
  1. "Extension Opened"
  2. "Prompt Typed"
  3. "Button Used in LLM"
- **Time Range**: Last 30 days
- **Group By**: "registered" (to compare registered vs. unregistered users)

## Dashboard 3: Retention Metrics

### User Retention
- **Report Type**: Retention
- **First Event**: "Visit Website"
- **Returning Event**: "Visit Website"
- **Time Range**: Last 90 days
- **Interval**: Weekly

### Extension Retention
- **Report Type**: Retention
- **First Event**: "Extension Opened"
- **Returning Event**: "Extension Opened"
- **Time Range**: Last 90 days
- **Interval**: Weekly

### Trial Conversion Rate
- **Report Type**: Funnel
- **Steps**:
  1. "Trial Finished Pop-up Shown"
  2. "Redirected to Register from Trial Ended"
  3. "Register Success"
- **Time Range**: Last 90 days

### Active Users
- **Report Type**: Line Chart
- **Metric**: Daily Active Users (DAU), Weekly Active Users (WAU), Monthly Active Users (MAU)
- **Events**: Any event
- **Time Range**: Last 90 days
- **Interval**: Daily

### User Lifecycle
- **Report Type**: Pie Chart
- **Event**: Any event
- **Group By**: "visitor_type"
- **Metric**: Unique users
- **Time Range**: Last 30 days

## Dashboard 4: A/B Testing Results

### Flow Comparison - Conversion Rate
- **Report Type**: Bar Chart
- **Event**: "Register Success"
- **Group By**: "flow"
- **Metric**: Conversion rate from "Visit Website"
- **Time Range**: Last 30 days

### Flow Comparison - Extension Usage
- **Report Type**: Bar Chart
- **Event**: "Extension Opened"
- **Group By**: "flow"
- **Metric**: Average events per user
- **Time Range**: Last 30 days

### Flow Comparison - Button Clicks
- **Report Type**: Table
- **Event**: "Button Clicked"
- **Group By**: "flow", "buttonName"
- **Metric**: Click-through rate
- **Time Range**: Last 30 days

### Flow Comparison - Retention
- **Report Type**: Retention
- **First Event**: "Visit Website"
- **Returning Event**: "Visit Website"
- **Time Range**: Last 90 days
- **Group By**: "flow"

## Dashboard 5: User Journey Analysis

### User Path Analysis
- **Report Type**: Pathfinder
- **Starting Point**: "Visit Website"
- **Ending Point**: "Register Success"
- **Time Range**: Last 30 days

### Time to Conversion
- **Report Type**: Histogram
- **Metric**: Time from "Visit Website" to "Register Success"
- **Time Range**: Last 30 days

### Drop-off Points
- **Report Type**: Funnel
- **Steps**: All major events in sequence
- **Time Range**: Last 30 days
- **Visualization**: Step conversion rates

### User Segments Performance
- **Report Type**: Table
- **Event**: "Register Success"
- **Group By**: "visitor_type"
- **Metric**: Conversion rate
- **Time Range**: Last 30 days

## Setting Up Cohorts

### New Users Cohort
- **Definition**: Users who performed "Visit Website" for the first time in the last 30 days
- **Use for**: Analyzing new user behavior

### Trial Users Cohort
- **Definition**: Users who have seen "Trial Finished Pop-up Shown" event
- **Use for**: Analyzing trial conversion

### Power Users Cohort
- **Definition**: Users who have performed "Button Used in LLM" more than 10 times in the last 30 days
- **Use for**: Understanding power user behavior

### Registered Users Cohort
- **Definition**: Users who have performed "Register Success" event
- **Use for**: Comparing registered vs. unregistered behavior

## Setting Up Alerts

### Conversion Drop Alert
- **Condition**: "Register Success" events drop by more than 20% compared to previous period
- **Notification**: Email to team

### Extension Usage Drop Alert
- **Condition**: "Extension Opened" events drop by more than 15% compared to previous period
- **Notification**: Email to team

### New User Spike Alert
- **Condition**: "Visit Website" events with unique users increase by more than 50% compared to previous period
- **Notification**: Email to team

## Implementation Steps

1. Log in to Mixpanel
2. Go to Dashboards and create each dashboard
3. Add reports to each dashboard as specified above
4. Set up cohorts in the Cohorts section
5. Configure alerts in the Alerts section
6. Share dashboards with team members

## Best Practices

1. **Naming Convention**: Use consistent naming for dashboards and reports
2. **Regular Reviews**: Schedule weekly reviews of dashboard data
3. **Iterative Improvement**: Add new reports as needed based on business questions
4. **Documentation**: Keep this guide updated with any changes to dashboard setup
5. **Access Control**: Ensure proper permissions are set for team members
