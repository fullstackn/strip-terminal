import { actions, useAppBridge } from "@saleor/app-sdk/app-bridge";
import { Box, Text } from "@saleor/macaw-ui";
import Link from "next/link";
import {useOrderDetailsGraphiQlQuery} from "../generated/graphql";

/**
 * GraphQL Code Generator scans for gql tags and generates types based on them.
 * The below query is used to generate the "useLastOrderQuery" hook.
 * If you modify it, make sure to run "pnpm codegen" to regenerate the types.
 */


function generateNumberOfLinesText(lines: any[]) {
  if (lines.length === 0) {
    return "no lines";
  }

  if (lines.length === 1) {
    return "1 line";
  }

  return `${lines.length} lines`;
}

export const OrderById = (params: any) => {
  const { appBridge } = useAppBridge();

  // Using the generated hook
  //const [{ data, fetching }] = useLastOrderQuery();
  const [{ data, fetching }] = useOrderDetailsGraphiQlQuery(
      {variables: {id: params.orderId}}
  );
  const lastOrder = data?.order;
  const navigateToOrder = (id: string) => {
    appBridge?.dispatch(
      actions.Redirect({
        to: `/orders/${id}`,
      })
    );
  };

  return (
    <Box display="flex" flexDirection={"column"} gap={2}>
      <Text as={"h2"} size={8}>
        Order details
      </Text>
      <>
        {fetching && <Text color="default2">Fetching the order...</Text>}
        {lastOrder && (
          <>
            <Box
              backgroundColor={"default2"}
              padding={4}
              borderRadius={4}
              borderWidth={1}
              borderStyle={"solid"}
              borderColor={"default2"}
              marginY={4}
            >
              <Text>{`The order #${lastOrder.number}:`}</Text>
              <ul>
                <li>
                  <Text>{`By ${lastOrder.user?.lastName}  ${lastOrder.user?.firstName}`}</Text>
                </li>
                <li>
                  <Text>{`Contains ${generateNumberOfLinesText(lastOrder.lines)} 🛒`}</Text>
                </li>
                <li>
                  <Text>{`For a total amount of ${lastOrder.total.gross.amount} ${lastOrder.total.gross.currency} 💸`}</Text>
                </li>
                <li>
                  <Text>{`Ships to ${lastOrder.shippingAddress?.country.country} 📦`}</Text>
                </li>
              </ul>
              <Link onClick={() => navigateToOrder(lastOrder.id)} href={`/orders/${lastOrder.id}`}>
                See the order details →
              </Link>
            </Box>
          </>
        )}
        {!fetching && !lastOrder && <Text color="default2">No orders found</Text>}
      </>
    </Box>
  );
};
