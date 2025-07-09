import React, { useState } from 'react';
import styled from 'styled-components';
import ButtonTracking from '../utils/buttonTracking';
import EventTracking from '../utils/eventTracking';

const HelpForm = ({ onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [showContactForm, setShowContactForm] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState("payment-methods");

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
      const response = await fetch("https://thinkvelocity.in/backend-V1-D/users/help-us", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (response.ok) {
        // Track successful submission
        EventTracking.track('Form Submission Success', {
          form_name: 'Help Form'
        });

        alert("Thank you for Contacting us!");
        setFormData({
          name: '',
          email: '',
          message: ''
        });
        setShowContactForm(false);
      } else {
        // Track submission error
        EventTracking.trackError('Form Submission', data.error, {
          form_name: 'Help Form'
        });

        alert("Error: " + data.error);
      }
    } catch (error) {
      // Track error
      EventTracking.trackError('Form Submission', error.message, {
        form_name: 'Help Form'
      });

      console.error("Error submitting help Message:", error);
      alert("Failed to submit Contact.");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFormClick = (e) => {
    e.stopPropagation();
  };

  const toggleQuestion = (id) => {
    // Track FAQ interaction
    EventTracking.trackButtonClick('FAQ Interaction', {
      faq_id: id,
      action: expandedQuestion === id ? 'collapse' : 'expand',
      form_name: 'Help Form'
    });

    if (expandedQuestion === id) {
      setExpandedQuestion(null);
    } else {
      setExpandedQuestion(id);
    }
  };

  const handleSubmitQuery = () => {
    // Track button click
    ButtonTracking.trackButtonClick('Submit Query', {
      form_name: 'Help Form',
      form_type: 'query',
      action: 'show_contact_form'
    });

    setShowContactForm(true);
  };

  const faqQuestions = [
    {
      id: "payment-methods",
      question: "What payment methods are accepted by the system?",
      answer: "We accept credit cards, debit cards, digital wallets, and bank transfers based on your location."
    },
    {
      id: "payment-fails",
      question: "What steps should I take if my payment fails?",
      answer: "Please check your payment details, ensure you have sufficient funds, and try again. If the issue persists, contact your bank or try a different payment method."
    },
    {
      id: "recover-account",
      question: "How do I recover my account if I forget my password or email?",
      answer: "You can use the 'Forgot Password' option on the login page. If you've also forgotten your email, please contact our support team with any identifying information."
    },
    {
      id: "report-bug",
      question: "How do I report a bug, and how long does it take to get fixed?",
      answer: "You can report bugs through this help center or by emailing support. Critical bugs are typically addressed within 24-48 hours, while less severe issues may take up to a week."
    }
  ];

  return (
    <StyledWrapper
      className="fixed bottom-24 right-4 md:right-14"
      onClick={onClose}
    >
      <div className="form-container" onClick={handleFormClick}>
        {!showContactForm ? (
          <div className="faq-container">
            <h2>How Can We Help?</h2>

            {faqQuestions.map((faq) => (
              <div key={faq.id} className="faq-item">
                <div
                  className="faq-question"
                  onClick={() => toggleQuestion(faq.id)}
                >
                  <span className="icon">{expandedQuestion === faq.id ? "−" : "+"}</span>
                  <span>{faq.question}</span>
                </div>

                {expandedQuestion === faq.id && (
                  <div className="faq-answer">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}

            <div className="query-text">
              Query not listed?
            </div>

            <button
              className="form-submit-btn submit-query-btn"
              onClick={handleSubmitQuery}
            >
              Submit Query
            </button>
          </div>
        ) : (
          <form className="form" onSubmit={handleSubmit}>
            <h2>How Can We Help?</h2>

            <div className="form-group">
              <label htmlFor="name">Your Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email id</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="message">Let us know how we can improve?</label>
              <textarea
                name="message"
                id="message"
                rows={4}
                value={formData.message}
                onChange={handleChange}
                required
              />
            </div>

            <button className="form-submit-btn submit-form-btn hove" type="submit">
              Submit
            </button>
          </form>
        )}
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  z-index: 50;
  .form-container {
    width: 300px;
    background: rgba(255, 255, 255, 0.95);
    padding: 24px 20px;
    font-size: 14px;
    font-family: inherit;
    color: black;
    display: flex;
    flex-direction: column;
    gap: 15px;
    box-sizing: border-box;
    border-radius: 16px;
    position: relative;
    overflow: hidden;
    border: 2px solid #000000;
    box-shadow: 3px 3px 2px rgb(0, 0, 0);

    h2 {
      text-align: center;
      margin: 0 0 15px 0;
      font-size: 18px;
      font-weight: bold;
    }
  }

  .faq-container {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .faq-item {
    position: relative;
    padding-bottom: 1px;
    margin-bottom: 1px;
  }

  .faq-item::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 1px;
    background: linear-gradient(to right, #f0f0f0, #00C8F0, #f0f0f0);
  }

  .faq-question {
    display: flex;
    align-items: flex-start;
    padding: 10px 0;
    cursor: pointer;
    font-size: 13px;

    .icon {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      margin-right: 8px;
      font-size: 18px;
      min-width: 15px;
      color: #00C8F0;
    }
  }

  .faq-answer {
    padding: 0 0 15px 23px;
    font-size: 12px;
    color: #333333;
    line-height: 1.4;
  }

  .query-text {
    text-align: center;
    margin-top: 10px;
    font-size: 12px;
    color: #717171;
  }

  .form-container button:active {
    scale: 0.95;
  }

  .form-container .form {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .form-container .form-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .form-container .form-group label {
    display: block;
    margin-bottom: 5px;
    color: black;
    font-weight: 600;
    font-size: 12px;
  }

  .form-container .form-group input {
    width: 100%;
    padding: 12px 16px;
    border-radius: 8px;
    color: black;
    font-family: inherit;
    background-color: white;
    border: 2px solid black;
  }

  .form-container .form-group textarea {
    width: 100%;
    padding: 12px 16px;
    border-radius: 8px;
    resize: none;
    color: black;
    height: 80px;
    background-color: white;
    font-family: inherit;
    overflow-y: auto;
    border: 2px solid black;
    scrollbar-width: none;
    -ms-overflow-style: none;
    &::-webkit-scrollbar {
      display: none;
    }
  }

  .form-container .form-group input:focus {
    outline: none;
    border-color: #00C8F0;
  }

  .form-container .form-group textarea:focus {
    outline: none;
    border-color: #00C8F0;
  }

  .form-submit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: inherit;
    font-weight: 600;
    background: #00C8F0;
    border: 2px solid #000000;
    padding: 10px 14px;
    font-size: inherit;
    cursor: pointer;
    border-radius: 9999px;
    transition: all 0.3s ease;
    color: white;
    box-shadow: 3px 3px 2px rgb(0, 0, 0);
  }

  .submit-query-btn {
    margin: 10px auto;
    width: 60%;
  }

  .submit-form-btn {
    margin: 0 auto;
    width: 50%;
  }

  .form-container .form-submit-btn:hover {
    background-color: #00C8F0;
    transform: translate(5px, 5px);
    box-shadow: none;
  }
`;

export default HelpForm;