# Nova Path Project Overview and Grader Instructions

## Live Deployment
Application URL: https://intexw26-web-21573.azurewebsites.net/

## Test Credentials
The following accounts have been seeded into the database for grading purposes.

| Role | Email | Password | MFA Required |
| :--- | :--- | :--- | :--- |
| Admin | admin@test.com | Admin@12345678! | No |
| MFA Admin | mfa_admin@test.com | MfaAdmin@12345678! | Yes |
| Donor | donor@test.com | Donor@12345678! | No |

## Multi-Factor Authentication (MFA) Manual Setup
If the automated setup flow does not trigger or if a manual override is required, please use the following Secret Key to link an account to your Google Authenticator or Authy app.

Manual Secret Key: JBSWY3DPEHPK3PXP

## Machine Learning Integration (IS 455)
Our application utilizes a Random Forest Classifier and K-Means Clustering to support Nova Path operations in Brazil. Key features include:

- Peer Matching: Residents are matched with mentors based on behavioral features and history.
- Risk Assessment: The system flags residents requiring immediate intervention based on predictive probability scores.
- Technical Validation: Our primary model achieved a 94.2% accuracy rating. Full methodology is documented in the IS455_Master_Models.ipynb notebook.

## Security and Infrastructure (IS 414)
- Environment Security: All sensitive keys (JWT secrets, DB strings) are managed via Azure Environment Variables.
- Security Headers: The application implements Content-Security-Policy (CSP) and X-Frame-Options to prevent common web vulnerabilities.
- Role-Based Access Control: Strict routing prevents Donor accounts from accessing Admin-level caseload data.
