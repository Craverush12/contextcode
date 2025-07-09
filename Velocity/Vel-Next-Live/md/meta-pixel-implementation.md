# Meta Pixel Implementation in Velocity

This document outlines the implementation of Meta Pixel tracking in the Velocity project.

## Implementation Overview

Meta Pixel has been integrated with our existing analytics infrastructure to provide comprehensive tracking across both Mixpanel and Meta Pixel platforms.

### Core Components

1. **Meta Pixel Utility** (`src/utils/metaPixel.js`)
   - Handles initialization and event tracking
   - Provides standardized methods for common events

2. **Integration with Event Tracking** (`src/utils/eventTracking.js`)
   - Updated to include Meta Pixel tracking alongside Mixpanel
   - Maintains consistent event tracking across platforms

3. **Payment Tracking** (`src/components/Paypal.jsx`, etc.)
   - Added purchase event tracking
   - Implemented checkout funnel tracking

## Standard Events Tracked

- **PageView** - When users visit any page
- **CompleteRegistration** - When users complete signup
- **Purchase** - When users complete a payment
- **InitiateCheckout** - When users begin the payment process
- **AddToCart** - When users select a credit package

## Custom Events Tracked

- **ButtonClick** - When users click important buttons
- **FeatureUsage** - When users engage with key features
- **Login** - When users log in

## Testing

Use the [Facebook Pixel Helper](https://developers.facebook.com/docs/meta-pixel/support/pixel-helper/) browser extension to verify proper implementation and event tracking.