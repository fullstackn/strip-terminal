import { actions, useAppBridge } from "@saleor/app-sdk/app-bridge";
import { Box, Button, Text } from "@saleor/macaw-ui";
import { useRouter } from "next/router";
import { gql} from 'urql';
import {OrderById} from "../order-by-id";
import {createIntent, getPaymentIntent, processRefund} from "../stripe";
import {useState} from "react";
import {
  useOrderDetailsGraphiQlQuery,
  useTransactionInitializeMutation,
  useRunUpdateMetadataMutation,
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
    const [modalIsOpen, setModalIsOpen] = useState(false);
  const stripeUrl = 'https://pay.stripe.com/receipts/payment/...';

  const openModal = () => {
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
  }

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
  const currentOrder = data?.order;

  let orderPaymentIntentionId = '';
  let orderReceiptUrl = '';
  if (currentOrder?.metadata.length){
    const resPaymentId = currentOrder?.metadata.find(el => el.key === 'paymentIntentionId');
    const resReceptUrl = currentOrder?.metadata.find(el => el.key === 'receiptUrl');
    if (resPaymentId) {
        orderPaymentIntentionId = resPaymentId.value;
    }
    if (resReceptUrl){
      orderReceiptUrl = resReceptUrl.value;
    }
  }

  const [, setPaymentLoading] = useState(false);
  const [, setPaymentError] = useState(null);
  const [, runUpdateMetadata] = useRunUpdateMetadataMutation()
  const handlePaymentButtonClick = async () => {
      // would better make buttons disabled while we are performing requests
      // or even place some spinner for the time we are waiting response from another service
      setPaymentLoading(true);
      setPaymentError(null);
        try {
            const createIntentResponse = await createIntent(currentOrder?.total.gross.amount, currentOrder?.total.gross.currency);
            const paymentIntentionIdVal = createIntentResponse.action?.process_payment_intent?.payment_intent;
            let paymentIntentionId = '';
            if (typeof paymentIntentionIdVal === 'string'){
                paymentIntentionId = paymentIntentionIdVal;
            }
            const paymentIntent =  await getPaymentIntent(paymentIntentionId);
            const receiptUrl =  paymentIntent.data[0].receipt_url;
            // if succeed set paymentIntentionId in order's metadata
            const updateMetadataResponse = await runUpdateMetadata(
                  {
                    id: String(orderId) ?? '',
                    input:  [
                        {key: 'paymentIntentionId', value: paymentIntentionId},
                        {key: 'receiptUrl', value: receiptUrl ? receiptUrl : ''},
                    ]
                  }
                  )

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
          appBridge?.dispatch({
                    type: "notification",
                    payload: {
                      status: "error",
                      title: "Payment",
                      text: err.message,
                      actionId: "message-from-app",
                    },
                  });
        } finally {
          setPaymentLoading(false);
        }

  };

  const handleRefundButtonClick = async () => {
      // would better make buttons disabled while we are performing requests
      // or even place some spinner for the time we are waiting response from another service
        try {

            const refundResponse = await processRefund(orderPaymentIntentionId);
            console.log('result', refundResponse);
            // if succeed clean up paymentIntent in order's metadata
            const updateMetadataResponse = await runUpdateMetadata(
                  {
                    id: String(orderId) ?? '',
                    input:  [{key: 'paymentIntentionId', value: ''}]
                  }
              )
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
              appBridge?.dispatch({
                        type: "notification",
                        payload: {
                          status: "error",
                          title: "Refund",
                          text: err.message,
                          actionId: "message-from-app",
                        },
                      });
        } finally {
            setPaymentLoading(false);
        }

  };



  return (
      <Box padding={8} display={"flex"} flexDirection={"column"} gap={6} __maxWidth={"640px"} sandbox={"allow-popups"} >
        <Box>
          <Text as={"p"}>
            <b>Stripe Terminal Payments</b>
          </Text>
        </Box>
        <OrderById orderId={orderId}/>
        <Box>
          <Box display={"flex"} gap={4} gridAutoFlow={"column"} marginY={4}>
            <Button
                variant={"secondary"}
                disabled={orderPaymentIntentionId !== ''}
                onClick={handlePaymentButtonClick}
            >
              Pay by terminal 💵
            </Button>
            <Button
                disabled={orderPaymentIntentionId === ''}
                variant={"secondary"}
                onClick={() => {
                  // at the moment have not found a clean way to open another url in saleor app
                  // due to iframe restrictions
                  appBridge?.dispatch({
                    type: "notification",
                    payload: {
                      status: "success",
                      title: "How to open in iframe?",
                      text: orderReceiptUrl,
                      actionId: "message-from-app",
                    },
                  });
                  console.log('print', orderReceiptUrl);
                }}
            >
              Print receipt 📃
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
