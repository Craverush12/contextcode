# Mixpanel Dashboard Setup for Button Tracking

This guide will help you set up a comprehensive Mixpanel dashboard to track and analyze all button interactions on your Velocity website.

## Dashboard Overview

The button tracking implementation sends events to Mixpanel with the event name "Button Clicked" and includes properties like:
- `buttonName`: The name of the button
- `location`: Where the button appears on the site
- `timestamp`: When the button was clicked
- Additional custom properties specific to each button

## Creating the Dashboard

1. Log in to your Mixpanel account
2. Go to "Dashboards" in the left sidebar
3. Click "Create Dashboard"
4. Name it "Button Interactions Dashboard"
5. Add the reports described below

## Key Reports to Add

### 1. Button Clicks by Button Name

**Report Type**: Bar Chart
**Settings**:
- Event: "Button Clicked"
- Group by: "buttonName"
- Metric: "Total events"
- Time Range: Last 30 days

This report shows which buttons are clicked most frequently.

### 2. Button Clicks Over Time

**Report Type**: Line Chart
**Settings**:
- Event: "Button Clicked"
- Breakdown: "buttonName" (top 5-10 buttons)
- Metric: "Total events"
- Time Range: Last 30 days
- Interval: Daily

This report shows trends in button usage over time.

### 3. Button Clicks by Location

**Report Type**: Pie Chart
**Settings**:
- Event: "Button Clicked"
- Group by: "location"
- Metric: "Total events"
- Time Range: Last 30 days

This report shows which areas of your site have the most button interactions.

### 4. Button Clicks by User

**Report Type**: Table
**Settings**:
- Event: "Button Clicked"
- Group by: "User"
- Columns: "Total events", "Distinct buttonName"
- Time Range: Last 30 days

This report shows which users are most active with buttons.

### 5. Button Conversion Funnel

**Report Type**: Funnel
**Settings**:
- Step 1: "Button Clicked" where "buttonName" equals "Try for Free"
- Step 2: "Button Clicked" where "buttonName" equals "Sign in" or "Sign in with Google"
- Step 3: "Button Clicked" where "buttonName" equals "Get More Credits"
- Time Range: Last 30 days

This funnel tracks the user journey from initial interest to conversion.

## Custom Funnels by User Flow

### Registration Flow

**Report Type**: Funnel
**Settings**:
- Step 1: "Button Clicked" where "buttonName" equals "Register"
- Step 2: "Button Clicked" where "buttonName" equals "Continue with Google" or "Register"
- Step 3: "User Registration" event
- Time Range: Last 30 days

### Login Flow

**Report Type**: Funnel
**Settings**:
- Step 1: "Button Clicked" where "buttonName" equals "Sign in" or "Sign in with Google"
- Step 2: "User Login" event
- Step 3: "Button Clicked" where "location" equals "profile_page"
- Time Range: Last 30 days

### Prompt Enhancement Flow

**Report Type**: Funnel
**Settings**:
- Step 1: "Button Clicked" where "buttonName" equals "Generate Enhanced Prompt"
- Step 2: Event that indicates prompt was generated
- Step 3: Any subsequent button click
- Time Range: Last 30 days

## Retention Analysis

**Report Type**: Retention
**Settings**:
- First Event: "Button Clicked" where "buttonName" equals "Try for Free"
- Returning Event: "Button Clicked" (any button)
- Time Range: Last 60 days
- Interval: Weekly

This report shows how many users who clicked "Try for Free" return to use the site in subsequent weeks.

## Segmentation Ideas

Create segments based on:

1. **User Type**:
   - New users vs. returning users
   - Free users vs. paid users

2. **Acquisition Source**:
   - Users from organic search
   - Users from paid campaigns
   - Users from referrals

3. **Feature Usage**:
   - Users who use prompt enhancement
   - Users who access their profile frequently
   - Users who have completed payment

## A/B Testing with Mixpanel

You can use Mixpanel to analyze A/B tests for button design, placement, or text:

1. Create a test with two button variants
2. Track each variant with a property like `buttonVariant: "A"` or `buttonVariant: "B"`
3. Create a report comparing conversion rates between variants

## Real-time Monitoring

Create a real-time view of button clicks:

**Report Type**: Live View
**Settings**:
- Event: "Button Clicked"
- Properties to show: "buttonName", "location", "User"

## Next Steps

1. Implement the button tracking code for all buttons using the utility functions
2. Set up the dashboard reports described above
3. Review the data after 1-2 weeks to identify patterns
4. Optimize button placement and design based on the data
5. Create additional custom reports for specific user flows
