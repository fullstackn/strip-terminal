<div align="center">
<img width="150" alt="saleor-app-template" src="https://user-images.githubusercontent.com/4006792/215185065-4ef2eda4-ca71-48cc-b14b-c776e0b491b6.png">
</div>

<div align="center">
  <h1>Stripe Terminal Payments</h1>
</div>

Boilerplate for Stripe Terminal Payments Saleor App. 

App supposed to be called from menu of order details by calling option `Stripe Terminal Payment`.

To use the application, you need to register a Stripe
account and set values for the environment variables
- STRIPE_SECRET_KEY (Developers -> API keys -> Secret key)
- STRIPE_READER_ID (Terminal reader ID)

The application page displays 
- information about the order we intend to pay for
- buttons for payment and refund

TODO
- Implement the correct payment creation process as described <a href="https://docs.saleor.io/developer/payments/payment-apps">here</a>
, so Stripe Terminal Payment should create payment and transaction linked with the
order. This should provide changing order status as well.
