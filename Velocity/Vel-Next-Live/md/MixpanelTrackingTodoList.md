# Mixpanel Tracking Implementation Todo List

This document outlines components that need tracking implementation and provides code examples for how to implement tracking in each component.

## Components Requiring Tracking Implementation

### 1. HelpForm Component (`src/components/HelpForm.jsx`)

This component has form submission and button clicks that should be tracked.

**Current Issues:**
- Form submission not tracked
- "Submit Query" button click not tracked

**Implementation Plan:**
```jsx
// Import tracking utilities
import ButtonTracking from '../utils/buttonTracking';
import EventTracking from '../utils/eventTracking';

// Track form submission
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Track form submission event
  EventTracking.track('Form Submitted', {
    form_name: 'Help Form',
    form_type: 'contact',
    has_name: !!formData.name,
    has_email: !!formData.email,
    has_message: !!formData.message
  });
  
  try {
    // Rest of your existing code...
  } catch (error) {
    // Track error
    EventTracking.trackError('Form Submission', error.message, {
      form_name: 'Help Form'
    });
    console.error("Error submitting help Message:", error);
    alert("Failed to submit Contact.");
  }
};

// Track button click
<button 
  className="form-submit-btn submit-query-btn" 
  onClick={ButtonTracking.createTrackedClickHandler(
    'Submit Query',
    handleSubmitQuery,
    { form_name: 'Help Form', form_type: 'query' }
  )}
>
  Submit Query
</button>
```

### 2. ContactUs Component (`src/components/Pages/ContactUs.jsx`)

This component has a form submission that should be tracked.

**Current Issues:**
- Form submission not tracked

**Implementation Plan:**
```jsx
// Import tracking utilities
import EventTracking from '../../utils/eventTracking';

// Track form submission
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Track form submission event
  EventTracking.track('Form Submitted', {
    form_name: 'Contact Us',
    form_type: 'contact',
    has_name: !!formData.name,
    has_email: !!formData.email,
    has_message: !!formData.message
  });
  
  try {
    // Rest of your existing code...
    
    if (response.ok) {
      // Track successful submission
      EventTracking.track('Form Submission Success', {
        form_name: 'Contact Us'
      });
      
      // Rest of your success handling...
    }
  } catch (error) {
    // Track error
    EventTracking.trackError('Form Submission', error.message, {
      form_name: 'Contact Us'
    });
    console.error("Error submitting help Message:", error);
    alert("Failed to submit Contact.");
  }
};
```

### 3. Buy_credit Component (`src/components/Buy_credit.jsx`)

This component has payment-related buttons and interactions that should be tracked.

**Current Issues:**
- Payment method selection not tracked
- Amount selection not tracked
- "Next" button click not tracked

**Implementation Plan:**
```jsx
// Import tracking utilities
import ButtonTracking from '../utils/buttonTracking';
import EventTracking from '../utils/eventTracking';

// Track payment method selection
const handlePaymentMethodChange = (method) => {
  setSelectedPaymentMethod(method);
  
  // Track payment method selection
  EventTracking.track('Payment Method Selected', {
    payment_method: method,
    location: 'buy_credits_modal'
  });
};

// Track amount selection
const handleAmountSelect = (amount, creditsValue) => {
  setSelectedAmount(amount);
  setCredits(creditsValue);
  setIsOtherSelected(false);
  
  // Track amount selection
  EventTracking.track('Credit Amount Selected', {
    amount: amount,
    credits: creditsValue,
    currency: regionPricing.currency,
    is_custom: false
  });
};

// Track custom amount
const handleCustomAmountChange = (e) => {
  const value = e.target.value;
  setCustomAmount(value);
  
  // Only track if the value is valid
  if (value && !isNaN(parseFloat(value))) {
    EventTracking.track('Custom Credit Amount Entered', {
      amount: parseFloat(value),
      currency: regionPricing.currency
    });
  }
};

// Track next button click
<button
  onClick={ButtonTracking.createTrackedClickHandler(
    'Payment Next',
    handleNextClick,
    { 
      payment_method: selectedPaymentMethod,
      amount: isOtherSelected ? parseFloat(customAmount) : selectedAmount,
      credits: credits,
      currency: regionPricing.currency
    }
  )}
  disabled={!selectedPaymentMethod || isLoading || 
           (isOtherSelected ? 
             (!customAmount || parseFloat(customAmount) < 50) : 
             (!selectedAmount || selectedAmount < 50))}
  className={`w-full py-2 px-6 rounded-full text-white text-center font-medium border-2 border-black ${
    selectedPaymentMethod && !isLoading && 
    (isOtherSelected ? 
      (customAmount && parseFloat(customAmount) >= 50) : 
      (selectedAmount && selectedAmount >= 50)) ? 
    "bg-[#00D2FF] hover:bg-[#00C5F0]" : 
    "bg-gray-400 cursor-not-allowed"
  }`}
>
  Next
</button>
```

### 4. Paypal Component (`src/components/Paypal.jsx`)

This component handles PayPal payments but doesn't track interactions.

**Current Issues:**
- PayPal button interactions not tracked

**Implementation Plan:**
```jsx
import React from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import EventTracking from "../utils/eventTracking";

const Paypal = ({ amount, credits }) => {
  // Existing code...
  
  return (
    <PayPalScriptProvider options={initialOptions}>
      <PayPalButtons
        style={styles}
        createOrder={(data, actions) => {
          // Track payment initiation
          EventTracking.track('Payment Initiated', {
            payment_method: 'paypal',
            amount: amount,
            credits: credits,
            currency: 'USD'
          });
          
          return actions.order.create({
            purchase_units: [
              {
                amount: {
                  value: amount.toString(),
                },
              },
            ],
          });
        }}
        onApprove={(data, actions) => {
          // Track payment approval
          EventTracking.track('Payment Approved', {
            payment_method: 'paypal',
            order_id: data.orderID,
            amount: amount,
            credits: credits,
            currency: 'USD'
          });
          
          return actions.order.capture().then((details) => {
            // Existing code...
            
            // Track payment completion
            EventTracking.track('Payment Completed', {
              payment_method: 'paypal',
              transaction_id: details.id,
              amount: amount,
              credits: credits,
              currency: 'USD',
              status: details.status
            });
          });
        }}
        onError={(err) => {
          // Track payment error
          EventTracking.trackError('Payment Error', err.message, {
            payment_method: 'paypal',
            amount: amount,
            credits: credits,
            currency: 'USD'
          });
          console.error("PayPal error:", err);
        }}
        onCancel={() => {
          // Track payment cancellation
          EventTracking.track('Payment Cancelled', {
            payment_method: 'paypal',
            amount: amount,
            credits: credits,
            currency: 'USD'
          });
        }}
      />
    </PayPalScriptProvider>
  );
};

export default Paypal;
```

### 5. ScrollAnchor Component (`src/components/layout/ScrollAnchor.jsx`)

This component has navigation buttons that should be tracked.

**Current Issues:**
- Navigation button clicks not tracked

**Implementation Plan:**
```jsx
// Import tracking utilities
import ButtonTracking from '../../utils/buttonTracking';

// Track button clicks
const handleClick = (id, refKey) => {
  setSelected(id);
  setIsMobileMenuOpen(false);
  
  // Track navigation click
  ButtonTracking.trackButtonClick('Navigation', {
    section: refKey,
    item_name: navigationItems.find(item => item.id === id)?.label || 'Unknown',
    device: window.innerWidth < 640 ? 'mobile' : 'desktop'
  });
  
  const targetRef = scrollRefs[refKey];
  if (targetRef?.current) {
    // Rest of your existing code...
  }
};
```

## General Recommendations

1. **Use VerifiableButton for Critical Actions**
   
   Replace standard buttons with VerifiableButton for critical actions like:
   - Payment buttons
   - Form submission buttons
   - Account actions

   Example:
   ```jsx
   import VerifiableButton from '../components/common/VerifiableButton';
   
   <VerifiableButton
     buttonName="Submit Form"
     verificationType="form_submission"
     onClick={handleSubmit}
     loadingText="Submitting..."
     additionalProps={{
       form_name: 'Contact Form',
       form_type: 'contact'
     }}
   >
     Submit
   </VerifiableButton>
   ```

2. **Add Page Visit Tracking to All Pages**
   
   Add useEffect hooks to track page visits in all page components:
   ```jsx
   import { useEffect } from 'react';
   import EventTracking from '../utils/eventTracking';
   
   useEffect(() => {
     EventTracking.trackVisit({
       page_name: 'Contact Us',
       page_category: 'support'
     });
   }, []);
   ```

3. **Use withInteractionTracking HOC for Complex Components**
   
   For components with many interactive elements, use the HOC:
   ```jsx
   import withInteractionTracking from '../utils/withInteractionTracking';
   
   const MyComponent = () => {
     // Component code...
   };
   
   export default withInteractionTracking(MyComponent, {
     componentName: 'MyComponent',
     location: 'main_page',
     trackAllClicks: true
   });
   ```
