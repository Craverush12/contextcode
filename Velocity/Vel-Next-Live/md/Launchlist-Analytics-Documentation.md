# Launchlist Analytics Implementation

This document outlines the enhanced analytics tracking implemented for the Launchlist component, which is used to collect email subscriptions for the newsletter.

## Overview

The Launchlist component now includes comprehensive analytics tracking using both Mixpanel and Meta Pixel. This implementation captures detailed user interactions, form submissions, and conversion events to provide valuable insights into user behavior and marketing effectiveness.

## Events Tracked

### Visibility Events

1. **Launchlist Modal Shown**
   - Tracked when the modal becomes visible to the user
   - Captured in both Mixpanel and Meta Pixel
   - Properties:
     - `timestamp`: When the modal was shown
     - `page`: The page where the modal was shown

### Interaction Events

1. **Email Input Focused**
   - Tracked when the user clicks on the email input field
   - Properties:
     - `timestamp`: When the focus occurred

2. **Email Entered**
   - Tracked when the user has entered an email and moved away from the field
   - Properties:
     - `email_domain`: Domain portion of the email (e.g., "gmail.com")
     - `email_length`: Length of the email entered
     - `has_at_symbol`: Whether the email contains an @ symbol
     - `timestamp`: When the blur event occurred

3. **Close Button Clicked**
   - Tracked when the user clicks the close (X) button
   - Properties:
     - `component`: "LaunchlistModal"
     - `action`: "dismiss"
     - `email_entered`: Whether the user had started typing an email

### Submission Events

1. **Button Clicked (Get Notified)**
   - Tracked when the user clicks the submission button
   - Properties:
     - `component`: "LaunchlistModal"
     - `email_provided`: Whether an email was provided
     - `email_domain`: Domain portion of the email
     - `visitor_type`: Type of visitor (First Time Visitor, Window Shopper, User)
     - Attribution data (UTM parameters, referrer, etc.)

2. **Launchlist Submission Attempt**
   - Tracked when the form submission begins
   - Properties:
     - `email_domain`: Domain portion of the email
     - `timestamp`: When the submission was attempted
     - `visitor_type`: Type of visitor

3. **Joined Launchlist (Success)**
   - Tracked when the API returns a successful response
   - Properties:
     - `type`: "success"
     - `email`: Full email address
     - `email_domain`: Domain portion of the email
     - `timestamp`: When the submission succeeded
     - `visitor_type`: Type of visitor
     - Attribution data (UTM parameters, referrer, etc.)

4. **Lead Generated (Meta Pixel)**
   - Tracked in Meta Pixel when a user successfully joins the launchlist
   - Properties:
     - `category`: "newsletter"
     - `email_domain`: Domain portion of the email
     - `lead_type`: "launchlist"

### Error Events

1. **Launchlist Submission Failed**
   - Tracked when the API returns an error response
   - Properties:
     - `type`: "api_error"
     - `email`: Full email address
     - `email_domain`: Domain portion of the email
     - `error`: Error message from the API
     - `timestamp`: When the error occurred
     - `visitor_type`: Type of visitor

2. **Form Submission Error (Meta Pixel)**
   - Tracked in Meta Pixel when a submission fails
   - Properties:
     - `form_type`: "launchlist"
     - `error_type`: "api_error"
     - `error_message`: Error message from the API

3. **Launchlist Submission Error**
   - Tracked when a JavaScript error occurs during submission
   - Properties:
     - `email_domain`: Domain portion of the email
     - `visitor_type`: Type of visitor

## User Properties Stored

When a user successfully joins the launchlist, the following information is stored in localStorage:

- `hasJoinedLaunchlist`: Set to "true"
- `launchlistEmail`: The email address provided
- `launchlistJoinDate`: ISO timestamp of when the user joined

## Attribution Tracking

The implementation includes comprehensive attribution tracking:

1. **First Touch Attribution**
   - Retrieves first touch data from localStorage (if available)
   - Includes referrer information, UTM parameters, and landing page

2. **Visitor Categorization**
   - Categorizes visitors as:
     - "First Time Visitor": New to the site
     - "Window Shopper": Has visited before but not registered
     - "User": Registered user (has a token)

## Privacy Considerations

To protect user privacy:

1. **Email Handling**
   - Full email addresses are only sent to Mixpanel for successful submissions
   - For other events, only the email domain is tracked
   - This allows for analysis of email providers without exposing PII

2. **Data Minimization**
   - Only necessary data is collected for each event
   - Personal identifiers are avoided where possible

## Implementation Details

The enhanced analytics implementation uses:

1. **EventTracking Utility** (`src/utils/eventTracking.js`)
   - Provides standardized tracking methods
   - Handles both Mixpanel and Meta Pixel tracking

2. **MetaPixel Utility** (`src/utils/metaPixel.js`)
   - Handles Facebook Pixel tracking
   - Supports both standard and custom events

3. **Analytics Module** (`src/config/analytics.js` or `src/lib/analytics.js`)
   - Core Mixpanel integration
   - Provides basic tracking methods

## Testing

To verify the analytics implementation:

1. **Open browser developer tools**
2. **Monitor network requests**:
   - Look for requests to `api.mixpanel.com`
   - Look for requests to `facebook.com/tr`
3. **Check console for any tracking errors**

## Debugging

If tracking issues occur:

1. **Check for Mixpanel errors in console**:
   - "Bad HTTP status: 0" indicates a CORS or network issue
   - Ensure Mixpanel domains are not blocked by ad blockers

2. **Verify Meta Pixel initialization**:
   - Use Facebook Pixel Helper browser extension
   - Check for proper event firing

## Future Enhancements

Potential improvements to consider:

1. **A/B Testing Integration**
   - Track which variant of the launchlist modal performs better

2. **Conversion Funnel Analysis**
   - Create a funnel from modal view to successful submission

3. **Cohort Analysis**
   - Track how newsletter subscribers engage with the product over time
