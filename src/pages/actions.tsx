import { actions, useAppBridge } from "@saleor/app-sdk/app-bridge";
import { Box, Button, Text } from "@saleor/macaw-ui";
import { useRouter } from "next/router";
import { gql} from 'urql';
import {OrderById} from "../order-by-id";
import {createIntent, processRefund} from "../stripe";
import {useState, useEffect} from "react";
import {
  useRunTransactionCreateMutation,
  useOrderDetailsGraphiQlQuery,
  useInitializePaymentGatewayMutation,
  PaymentGatewayToInitialize,
  useTransactionInitializeMutation, useTransactionProcessMutation, useRunUpdateMetadataMutation,
} from "../../generated/graphql";


gql`
  mutation runUpdateMetadata($id: ID!, $input: [MetadataInput!]!){
        updateMetadata(
        id: $id
        input: $input
       ) {
          errors {
            field
            message
          }
        }
  }
`

gql`
mutation runTransactionCreate($id: ID!, $amount: PositiveDecimal!, $currency: String!){
  transactionCreate(
    id: $id
    transaction: {
      name: "Credit card"
      message: "Authorized"
      pspReference: "PSP-ref123"
      availableActions: [CANCEL, CHARGE]
      amountAuthorized: { currency: $currency, amount: $amount }
      externalUrl: "https://saleor.io/payment-id/123"
    }
  ) {
    transaction {
      id
    }
  }
}`;


gql`
query OrderDetailsGraphiQL($id: ID!) {
  order(id: $id) {
    id
    number
    status
    isShippingRequired
    canFinalize
    created
    customerNote
    paymentStatus
    userEmail
    metadata {
      key
      value
    }
    isPaid
    user {
      firstName
      lastName
    }
    shippingAddress {
      country {
        country
      }
    }
    total {
      gross {
        amount
        currency
      }
    }
    lines {
      productName
    }
  }
}`;

const ActionsPage = () => {

  const router = useRouter();
  const { orderId } = router.query;
  const { appBridge} = useAppBridge();

  const navigateToOrders = () => {
    appBridge?.dispatch(
      actions.Redirect({
        to: `/orders`,
      })
    );
  };
  const navigateBackToOrder = () => {
    appBridge?.dispatch(
      actions.Redirect({
        to: `/orders/${orderId}`,
      })
    );
  };
  const opt: any = {variables: {id: orderId}};
  const [{data, fetching}] = useOrderDetailsGraphiQlQuery(opt);
  console.log('data', data);
  const lastOrder = data?.order;

  let orderPaymentIntentionId = '';
  if (lastOrder?.metadata.length){
    const res = lastOrder?.metadata.filter(obj => {return obj.key === 'paymentIntentionId'});
    orderPaymentIntentionId  = res[0].value;
  }

  console.log('orderPaymentIntentionId', orderPaymentIntentionId);

  const [paymentdata, setPaymentData] = useState(null);
  const [paymentloading, setPaymentLoading] = useState(false);
  const [pamenterror, setPaymentError] = useState(null);
  const [createTrnState, createTrn] = useRunTransactionCreateMutation();
  const [, runInitializePaymentGatewayMutation] = useInitializePaymentGatewayMutation()
  const [, runTransactionInitialize] = useTransactionInitializeMutation()
  const [, runTransactionProcess] = useTransactionProcessMutation()
  const [, runUpdateMetadata] = useRunUpdateMetadataMutation()
  const handlePaymentButtonClick = async () => {
    setPaymentLoading(true);
    setPaymentError(null);
    try {
      const createIntentResponse = await createIntent(lastOrder?.total.gross.amount, lastOrder?.total.gross.currency);
      const paymentIntentionId = createIntentResponse.action?.process_payment_intent?.payment_intent;
      const updateMetadataResponse = await runUpdateMetadata(
          {
            id: orderId,
            input:  [{key: 'paymentIntentionId', value: paymentIntentionId}]
          }
      )
      console.log('updateMetadataResponse', updateMetadataResponse);
      console.log('paymentIntentionId', paymentIntentionId);
      //const createPaymentResponse = makeOrderPaid(orderId, "777", "dummy");
      //console.log("createPaymentResponse", createPaymentResponse);
      const paymentGateways = [{ id: "stripe.terminal.saleor.app" }];
      //const initPaymentResponse = await runInitializePaymentGatewayMutation(
       //   {id:paymentIntentionId,  amount: lastOrder?.total.gross.amount,  paymentGateways: paymentGateways});
      //console.log('initPaymentResponse', initPaymentResponse);
      const trnInitResponse = await runTransactionInitialize(
          {id: orderId,
              amount: lastOrder?.total.gross.amount,
              paymentGateway: paymentGateways[0]}
      );
      console.log(trnInitResponse);
      /*
      const transactionId = trnInitResponse.data?.transactionInitialize?.transaction?.id;
      const trnProcessResponse = await runTransactionProcess({id: transactionId});
      //console.log("createPaymentResponse", initPaymentResponse);
      console.log("trnInitResponse", trnInitResponse);
      console.log("trnProcessResponse", trnProcessResponse);
      */
      appBridge?.dispatch({
                type: "notification",
                payload: {
                  status: "success",
                  title: "Payment",
                  text: "Payment passed successfully",
                  actionId: "message-from-app",
                },
              });
    } catch (err: any) {
      console.log(err);
      setPaymentError(err.message);
    } finally {
      setPaymentLoading(false);
    }

  };

  const handleRefundButtonClick = async () => {
    try {
      const refundResponse = await processRefund(orderPaymentIntentionId);
      console.log('result', refundResponse);

      const updateMetadataResponse = await runUpdateMetadata(
          {
            id: orderId,
            input:  [{key: 'paymentIntentionId', value: ''}]
          }
      )
      console.log('updateMetadataResponse', updateMetadataResponse);
      appBridge?.dispatch({
                type: "notification",
                payload: {
                  status: "success",
                  title: "Refund",
                  text: "Refund passed successfully",
                  actionId: "message-from-app",
                },
              });
    } catch (err: any) {
      console.log(err);
      setPaymentError(err.message);
    } finally {
      setPaymentLoading(false);
    }

  };



  return (
    <Box padding={8} display={"flex"} flexDirection={"column"} gap={6} __maxWidth={"640px"}>
      <Box>
        <Text as={"p"}>
          <b>Stripe Terminal Payments</b>
          </Text>
      </Box>
      <OrderById orderId={orderId} />
      <Box>
        <Box display={"flex"} gap={4} gridAutoFlow={"column"} marginY={4}>
          <Button
            variant={"secondary"}
            disabled={orderPaymentIntentionId !== ''}
            onClick={handlePaymentButtonClick}
          >
            Pay by terminal 💵
          </Button>
          <Button variant={"secondary"} onClick={() => {
              appBridge?.dispatch({
                type: "notification",
                payload: {
                  status: "success",
                  title: "You rock!",
                  text: "This notification was triggered from Saleor App",
                  actionId: "message-from-app",
                },
              });
            }}>
            Print receipt 📃
          </Button>
          <Button variant={"secondary"} onClick={() => {
              appBridge?.dispatch({
                type: "notification",
                payload: {
                  status: "success",
                  title: "You rock!",
                  text: "This notification was triggered from Saleor App",
                  actionId: "message-from-app",
                },
              });
            }}>
            Re-print receipt 📃
          </Button>
          <Button
              variant={"secondary"}
              onClick={handleRefundButtonClick}
              disabled={orderPaymentIntentionId === ''}
          >
            Refund ⬅️
          </Button>
          <Button variant={"secondary"} onClick={navigateBackToOrder}>
            Cancel ❌
          </Button>
        </Box>
      </Box>

      <Box display="flex" flexDirection={"column"} gap={2}>
        <Text as={"h2"} size={8}>
          Webhooks
        </Text>
        <>
          {paymentdata && (
            <Text>Payment succeed</Text>
          )} </>

        <Text>
          The App Template contains an example <code>ORDER_CREATED</code> webhook under the path{" "}
          <code>src/pages/api/order-created</code>.
        </Text>
        <Text as="p">
          Create any{" "}
          <Text
            as={"a"}
            fontWeight="bold"
            size={4}
            onClick={navigateToOrders}
            cursor={"pointer"}
            color={"info1"}
          >
            Order
          </Text>{" "}
          and check your console output!
        </Text>
      </Box>
    </Box>
  );
};

export default ActionsPage;
