import gql from "graphql-tag";
import {useInitializePaymentGatewayMutation} from "../generated/graphql";

gql`
  mutation InitializePaymentGateway(
    $id: ID!, 
    $amount: PositiveDecimal!, 
    $paymentGateways: [PaymentGatewayToInitialize!]
  ) {
    paymentGatewayInitialize(
      id: $id
      amount: $amount
      paymentGateways: $paymentGateways
    ) {
      gatewayConfigs {
        id
        data
        errors {
          field
          message
          code
        }
      }
      errors {
        field
        message
        code
      }
    }
  }
`;


gql`mutation TransactionInitialize(
    $id: ID!, 
    $amount: PositiveDecimal!, 
    $paymentGateway: PaymentGatewayToInitialize!
  ) {
  transactionInitialize(
    amount: $amount
    id: $id
    paymentGateway: $paymentGateway
  ) {
    transaction {
      id
    }
    transactionEvent {
      type
      pspReference
    }
    errors {
      field
      message
      code
    }
  }
}
`

gql`mutation TransactionProcess(
$id: ID!
) {
  transactionProcess(
    id: $id
    data: { additional: { actions: "details" } }
  ) {
    transaction {
      id
    }
    transactionEvent {
      type
      pspReference
    }
    errors {
      field
      message
      code
    }
  }
}
    `