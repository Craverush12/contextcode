# Meta Pixel Implementation Guide

This document provides instructions on how to set up and use Meta Pixel tracking in the Velocity project.

## Setup Instructions

1. **Create a Meta Pixel in Facebook Business Manager**
   - Go to [Facebook Business Manager](https://business.facebook.com/)
   - Navigate to Events Manager
   - Click "Connect Data Sources" and select "Web"
   - Follow the steps to create a new Meta Pixel

2. **Add Meta Pixel ID to Environment Variables**
   - Create or update your `.env.local` file in the project root
   - Add the following line with your Meta Pixel ID:
     ```
     NEXT_PUBLIC_META_PIXEL_ID=your_pixel_id_here
     ```
   - Restart your development server

3. **Verify Implementation**
   - Install the [Facebook Pixel Helper](https://developers.facebook.com/docs/meta-pixel/support/pixel-helper/) browser extension
   - Visit your website and check if the Pixel is firing correctly
   - Verify that events are being tracked properly

## Events Being Tracked

The following events are tracked with Meta Pixel:

1. **PageView** - Tracked on every page load
2. **CompleteRegistration** - When users complete signup
3. **InitiateCheckout** - When users begin the payment process
4. **Purchase** - When users complete a payment
5. **ButtonClick** (Custom Event) - When users click important buttons
6. **Login** (Custom Event) - When users log in

## Implementation Details

The Meta Pixel implementation consists of the following components:

1. **Meta Pixel Utility** (`src/utils/metaPixel.js`)
   - Handles initialization and event tracking
   - Provides standardized methods for common events

2. **Meta Pixel Script Component** (`src/components/MetaPixelScript.jsx`)
   - Initializes Meta Pixel on page load
   - Added to the main layout component

3. **Integration with Event Tracking** (`src/utils/eventTracking.js`)
   - Updated to include Meta Pixel tracking alongside Mixpanel
   - Maintains consistent event tracking across platforms

4. **Payment Tracking** (`src/components/Paypal.jsx`, `src/components/Buy_credit.jsx`)
   - Added purchase event tracking
   - Implemented checkout funnel tracking

## Testing

Use the [Facebook Pixel Helper](https://developers.facebook.com/docs/meta-pixel/support/pixel-helper/) browser extension to verify proper implementation and event tracking.

## Troubleshooting

If events are not being tracked:

1. Check that the Meta Pixel ID is correctly set in the environment variables
2. Verify that the MetaPixelScript component is included in the layout
3. Check browser console for any errors
4. Ensure that the Facebook Pixel Helper extension shows the pixel is active

## Additional Resources

- [Meta Pixel Documentation](https://developers.facebook.com/docs/meta-pixel/)
- [Meta Pixel Event Reference](https://developers.facebook.com/docs/meta-pixel/reference)
- [Meta Pixel Best Practices](https://developers.facebook.com/docs/meta-pixel/implementation/best-practices)
