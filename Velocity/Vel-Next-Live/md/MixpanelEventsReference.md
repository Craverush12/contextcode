# Mixpanel Events Reference

This document provides a comprehensive list of all events tracked in the Velocity application using Mixpanel. Use this as a reference when analyzing data or setting up dashboards.

## Page/Visit Events

| Event Name | Description | Key Properties |
|------------|-------------|----------------|
| `Page View` | Tracked when a user views a page | `page_path`, `page_url`, `referrer` |
| `Session Started` | Tracked when a user session begins | `session_id`, `timestamp`, `device_type` |
| `Session Ended` | Tracked when a user session ends | `session_id`, `duration`, `timestamp` |
| `Heartbeat` | Regular updates on user presence | `session_id`, `timestamp`, `idle_time` |
| `User Idle` | Tracked when a user becomes inactive | `session_id`, `timestamp`, `idle_duration` |
| `User Returned` | Tracked when a user returns from being idle | `session_id`, `timestamp`, `idle_duration` |

## Button/Interaction Events

| Event Name | Description | Key Properties |
|------------|-------------|----------------|
| `Button Clicked` | Generic button click event | `buttonName`, `location`, `timestamp` |
| `Navigation` | Navigation button click in ScrollAnchor | `section`, `item_name`, `device` |
| `Mobile Menu Toggle` | Mobile menu open/close | `action` (open/close), `device` |
| `Contact Form Submit` | Contact form submit button click | `form_name`, `has_name`, `has_email`, `has_message` |
| `Contact Form Submit Hover` | Hover on contact form submit button | `form_name`, `interaction_type` |
| `Submit Query` | Help form query button click | `form_name`, `form_type`, `action` |
| `FAQ Interaction` | FAQ expand/collapse interaction | `faq_id`, `action` (expand/collapse), `form_name` |
| `User Interaction` | Generic user interaction with UI elements | `element_type`, `element_name`, `location` |

## Form Events

| Event Name | Description | Key Properties |
|------------|-------------|----------------|
| `Form Submitted` | Generic form submission event | `form_name`, `form_type`, `has_name`, `has_email`, `has_message` |
| `Form Submission Success` | Successful form submission | `form_name`, `timestamp` |
| `Form Submission Error` | Form submission error | `form_name`, `error_message` |

## User Authentication Events

| Event Name | Description | Key Properties |
|------------|-------------|----------------|
| `User Login` | User login event | `method`, `timestamp`, `flow` |
| `User Signup` | User signup event | `method`, `timestamp`, `flow` |
| `Redirect to Register` | Redirect to registration page | `source`, `button` |
| `Register Success` | Successful registration | `method`, `timestamp` |

## Payment Events

| Event Name | Description | Key Properties |
|------------|-------------|----------------|
| `Credit Amount Selected` | User selects a credit amount | `amount`, `credits`, `currency`, `is_custom` |
| `Custom Amount Option Selected` | User selects custom amount option | `currency` |
| `Custom Credit Amount Entered` | User enters a custom credit amount | `amount`, `credits`, `currency` |
| `Payment Method Selected` | User selects a payment method | `payment_method`, `payment_method_name`, `location`, `amount`, `credits` |
| `payment_method_selected` | Legacy event for payment method selection | `methodId`, `timestamp` |
| `Payment Next` | User clicks next in payment flow | `payment_method`, `amount`, `credits`, `currency` |
| `Payment Processing` | Payment is being processed | `payment_method`, `amount`, `credits`, `currency` |
| `Payment Initiated` | Payment process has started | `payment_method`, `amount`, `credits`, `currency` |
| `Payment Approved` | Payment has been approved | `payment_method`, `order_id`, `amount`, `credits`, `currency` |
| `Payment Completed` | Payment has been completed | `payment_method`, `order_id`, `transaction_id`, `amount`, `credits`, `currency`, `status` |
| `Payment Cancelled` | Payment has been cancelled | `payment_method`, `order_id`, `amount`, `credits`, `currency` |

## PayPal Specific Events

| Event Name | Description | Key Properties |
|------------|-------------|----------------|
| `PayPal Order Created` | PayPal order has been created | `order_id`, `amount`, `credits` |
| `Order Details Fetched` | PayPal order details fetched | `payment_method`, `order_id` |
| `Order Details Fetched On Cancel` | Order details fetched after cancellation | `payment_method`, `order_id` |

## Extension Events

| Event Name | Description | Key Properties |
|------------|-------------|----------------|
| `Redirect to Webstore` | Redirect to Chrome Web Store | `source`, `button`, `location` |
| `Download Extension` | Extension download event | `source`, `button` |
| `Extension Opened` | Extension open event | `extension_version`, `trigger` |
| `Prompt Typed` | Prompt typed in extension | `promptLength`, `registered` |
| `Button Used in LLM` | Button used in LLM | `buttonName`, `llmPlatform` |
| `Trial Finished Popup Shown` | Trial finished popup shown | `remaining_credits` |

## Verification Events

| Event Name | Description | Key Properties |
|------------|-------------|----------------|
| `Verification Started` | Verification process started | `buttonName`, `verificationType` |
| `Verification Completed` | Verification process completed | `buttonName`, `verificationType`, `success` |
| `Verification Abandoned` | Verification process abandoned | `buttonName`, `verificationType`, `reason` |

## Error Events

| Event Name | Description | Key Properties |
|------------|-------------|----------------|
| `Error Occurred` | Generic error event | `error_type`, `error_message`, `timestamp` |
| `Form Submission` | Form submission error | `form_name`, `error_message` |
| `Payment Validation` | Payment validation error | `payment_method`, `amount`, `min_required` |
| `Payment Error` | Payment processing error | `payment_method`, `error_message`, `amount`, `credits` |
| `PayPal Order Creation` | PayPal order creation error | `error_message`, `response` |
| `PayPal Payment Verification` | PayPal payment verification error | `error_message`, `order_id` |
| `PayPal Order Details` | PayPal order details fetch error | `error_message`, `order_id`, `status_code`, `context` |
| `PayPal Payment Error` | PayPal payment error | `error_message`, `order_id`, `amount`, `credits` |
| `PayPal Payment Status` | PayPal payment status error | `order_id`, `status` |
| `Payment Method Selection` | Payment method selection error | `error_message`, `payment_method` |

## User Property Events

| Event Name | Description | Key Properties |
|------------|-------------|----------------|
| `User Properties Updated` | User properties updated | Various user properties |
| `User Preferences Updated` | User preferences updated | Various preference properties |
| `Engagement Metrics Updated` | User engagement metrics updated | `sessions_count`, `features_used`, etc. |
| `Subscription Status Changed` | Subscription status changed | `subscription_status`, `plan`, etc. |

## How to Use This Reference

### For Analyzing Data in Mixpanel

1. **Creating Funnels**: Use sequential events to create funnels, such as:
   - Visit → Button Click → Form Submit → Form Success
   - Credit Amount Selected → Payment Method Selected → Payment Initiated → Payment Completed

2. **Tracking Conversion Rates**:
   - Compare `Form Submitted` vs `Form Submission Success`
   - Compare `Payment Initiated` vs `Payment Completed`

3. **Monitoring Errors**:
   - Track frequency of different error types
   - Identify common failure points in user journeys

### For Developers

1. **Consistent Event Naming**:
   - Follow the naming patterns in this document
   - Use existing events where possible instead of creating new ones

2. **Property Standardization**:
   - Include standard properties like `timestamp` and `location`
   - Use consistent property names across similar events

3. **Error Tracking**:
   - Always include error type and message
   - Add context-specific properties to help with debugging

### For Product Managers

1. **Key Metrics to Monitor**:
   - Session duration and frequency
   - Form completion rates
   - Payment conversion rates
   - Error rates by type

2. **User Journey Analysis**:
   - Track common paths through the application
   - Identify drop-off points in critical flows

3. **Feature Usage**:
   - Monitor which features are most used
   - Track engagement with new features
