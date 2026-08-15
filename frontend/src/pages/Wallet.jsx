import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import styled from "styled-components";
import { Wallet as WalletIcon, Plus } from "lucide-react";
import {
  getMyWallet,
  listMyTransactions,
  createRechargeOrder,
  verifyRecharge,
  requestWithdrawal,
  listMyWithdrawals,
} from "../api/wallet";
import { useAuth } from "../context/AuthContext";
import { openRazorpayCheckout } from "../utils/razorpayCheckout";
import { PageContainer, PageTitle, SectionTitle, Stack, Row, Muted, EmptyState } from "../components/ui/Layout";
import { Card, CardRow } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Field, Input, Select } from "../components/ui/Form";
import { StatusBadge } from "../components/ui/Badge";
import { Spinner } from "../components/ui/Spinner";
import { Pagination } from "../components/ui/Pagination";
import { TableScroll, Table, Th, Td, Tr } from "../components/ui/Table";
import { formatINR, formatDateTime } from "../utils/format";

const TX_LABELS = {
  recharge: "Wallet recharge",
  booking_payment: "Booking payment",
  payout_credit: "Booking payout",
  withdrawal_debit: "Withdrawal requested",
  withdrawal_refund: "Withdrawal refunded",
  refund: "Refund",
  adjustment: "Adjustment",
};

const BalanceRow = styled(CardRow)`
  align-items: center;
`;

const BalanceNumber = styled.div`
  font-size: 30px;
  font-weight: 800;
`;

const BalanceIcon = styled.span`
  width: 44px;
  height: 44px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.accentSoft};
  color: ${({ theme }) => theme.color.accentStrong};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const RechargeForm = styled.form`
  display: flex;
  gap: ${({ theme }) => theme.space(2)};
  align-items: flex-end;
  flex-wrap: wrap;
`;

export const Wallet = () => {
  const { user } = useAuth();
  const isTransporter = user?.roles?.includes("transporter");

  const [wallet, setWallet] = useState(null);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [recharging, setRecharging] = useState(false);

  const [txItems, setTxItems] = useState([]);
  const [txPage, setTxPage] = useState(1);
  const [txPages, setTxPages] = useState(1);
  const [txTotal, setTxTotal] = useState(0);
  const [loadingTx, setLoadingTx] = useState(true);

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("upi");
  const [upiId, setUpiId] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);

  const [withdrawals, setWithdrawals] = useState([]);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(isTransporter);

  const loadWallet = () =>
    getMyWallet()
      .then(({ wallet }) => setWallet(wallet))
      .catch((error) => toast.error(error.message))
      .finally(() => setLoadingWallet(false));

  const loadTransactions = (page) =>
    listMyTransactions({ page, limit: 20 })
      .then((res) => {
        setTxItems(res.items || []);
        setTxTotal(res.total || 0);
        setTxPages(res.pages || 1);
      })
      .catch((error) => toast.error(error.message))
      .finally(() => setLoadingTx(false));

  const loadWithdrawals = () => {
    if (!isTransporter) return Promise.resolve();
    return listMyWithdrawals({ limit: 10 })
      .then((res) => setWithdrawals(res.items || []))
      .catch((error) => toast.error(error.message))
      .finally(() => setLoadingWithdrawals(false));
  };

  useEffect(() => {
    loadWallet();
    loadWithdrawals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadTransactions(txPage);
  }, [txPage]);

  const handleRecharge = async (e) => {
    e.preventDefault();
    const amount = Number(rechargeAmount);
    if (!amount || amount < 10) {
      toast.error("Enter at least ₹10 to recharge");
      return;
    }
    setRecharging(true);
    try {
      const { order } = await createRechargeOrder(amount);
      const response = await openRazorpayCheckout({
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        keyId: order.keyId,
        description: "Wallet recharge",
        prefill: { name: user?.name, contact: user?.mobile },
      });
      await verifyRecharge({
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      });
      toast.success("Wallet recharged");
      setRechargeAmount("");
      await Promise.all([loadWallet(), loadTransactions(1)]);
      setTxPage(1);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setRecharging(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (amount > (wallet?.balance ?? 0)) {
      toast.error(`You only have ${formatINR(wallet?.balance ?? 0)} available`);
      return;
    }
    if (payoutMethod === "upi" && !upiId.trim()) {
      toast.error("Enter your UPI ID");
      return;
    }
    if (payoutMethod === "bank" && (!accountHolderName.trim() || !accountNumber.trim() || !ifscCode.trim())) {
      toast.error("Fill in your bank account details");
      return;
    }

    setSubmittingWithdrawal(true);
    try {
      await requestWithdrawal({
        amount,
        payoutMethod,
        upiId: payoutMethod === "upi" ? upiId.trim() : undefined,
        bankDetails:
          payoutMethod === "bank"
            ? { accountHolderName: accountHolderName.trim(), accountNumber: accountNumber.trim(), ifscCode: ifscCode.trim() }
            : undefined,
      });
      toast.success("Withdrawal request submitted");
      setWithdrawAmount("");
      setUpiId("");
      setAccountHolderName("");
      setAccountNumber("");
      setIfscCode("");
      await Promise.all([loadWallet(), loadWithdrawals(), loadTransactions(1)]);
      setTxPage(1);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmittingWithdrawal(false);
    }
  };

  return (
    <PageContainer style={{ maxWidth: 780 }}>
      <PageTitle>Wallet</PageTitle>

      <Stack $gap={4} style={{ marginTop: 20 }}>
        <Card>
          {loadingWallet ? (
            <Row style={{ justifyContent: "center", padding: "20px 0" }}>
              <Spinner $size={24} />
            </Row>
          ) : (
            <Stack $gap={4}>
              <BalanceRow>
                <Row $gap={3}>
                  <BalanceIcon>
                    <WalletIcon size={20} strokeWidth={2.2} />
                  </BalanceIcon>
                  <Stack $gap={0}>
                    <Muted>Available balance</Muted>
                    <BalanceNumber>{formatINR(wallet?.balance)}</BalanceNumber>
                  </Stack>
                </Row>
              </BalanceRow>

              <RechargeForm onSubmit={handleRecharge}>
                <Field label="Add money (₹)" style={{ marginBottom: 0, flex: 1, minWidth: 140 }}>
                  <Input
                    type="number"
                    min="10"
                    step="1"
                    placeholder="e.g. 500"
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(e.target.value)}
                  />
                </Field>
                <Button type="submit" disabled={recharging}>
                  <Plus size={16} strokeWidth={2.4} />
                  {recharging ? "Opening…" : "Add money"}
                </Button>
              </RechargeForm>
            </Stack>
          )}
        </Card>

        {isTransporter && (
          <Card>
            <Stack $gap={3}>
              <SectionTitle>Withdraw to bank/UPI</SectionTitle>
              <Muted>
                Submit a request and our team will transfer the amount to your bank or UPI within 1–2 business days.
              </Muted>
              <form onSubmit={handleWithdraw}>
                <Stack $gap={3}>
                  <Row $gap={3} $wrap>
                    <Field label="Amount (₹)" style={{ marginBottom: 0, minWidth: 140 }}>
                      <Input
                        type="number"
                        min="1"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                      />
                    </Field>
                    <Field label="Payout method" style={{ marginBottom: 0, minWidth: 140 }}>
                      <Select value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value)}>
                        <option value="upi">UPI</option>
                        <option value="bank">Bank transfer</option>
                      </Select>
                    </Field>
                  </Row>

                  {payoutMethod === "upi" ? (
                    <Field label="UPI ID">
                      <Input placeholder="yourname@upi" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
                    </Field>
                  ) : (
                    <>
                      <Field label="Account holder name">
                        <Input value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)} />
                      </Field>
                      <Row $gap={3} $wrap>
                        <Field label="Account number" style={{ marginBottom: 0, flex: 1, minWidth: 160 }}>
                          <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
                        </Field>
                        <Field label="IFSC code" style={{ marginBottom: 0, flex: 1, minWidth: 140 }}>
                          <Input value={ifscCode} onChange={(e) => setIfscCode(e.target.value)} />
                        </Field>
                      </Row>
                    </>
                  )}

                  <div>
                    <Button type="submit" disabled={submittingWithdrawal}>
                      {submittingWithdrawal ? "Submitting…" : "Request withdrawal"}
                    </Button>
                  </div>
                </Stack>
              </form>

              {!loadingWithdrawals && withdrawals.length > 0 && (
                <Stack $gap={2} style={{ marginTop: 8 }}>
                  <Muted>Recent requests</Muted>
                  {withdrawals.map((w) => (
                    <CardRow key={w._id} style={{ fontSize: 13.5 }}>
                      <span>
                        {formatINR(w.amount)} · {formatDateTime(w.createdAt)}
                      </span>
                      <StatusBadge status={w.status} />
                    </CardRow>
                  ))}
                </Stack>
              )}
            </Stack>
          </Card>
        )}

        <Card>
          <SectionTitle style={{ marginBottom: 16 }}>Transaction history</SectionTitle>
          {loadingTx ? (
            <Row style={{ justifyContent: "center", padding: "40px 0" }}>
              <Spinner $size={24} />
            </Row>
          ) : txItems.length === 0 ? (
            <EmptyState>
              <Muted>No wallet activity yet.</Muted>
            </EmptyState>
          ) : (
            <>
              <TableScroll>
                <Table $minWidth="560px">
                  <thead>
                    <tr>
                      <Th>Date</Th>
                      <Th>Type</Th>
                      <Th>Amount (₹)</Th>
                      <Th>Balance after (₹)</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {txItems.map((tx) => (
                      <Tr key={tx._id}>
                        <Td>{formatDateTime(tx.createdAt)}</Td>
                        <Td>{TX_LABELS[tx.type] || tx.type}</Td>
                        <Td>
                          {tx.direction === "credit" ? "+" : "−"}
                          {formatINR(tx.amount)}
                        </Td>
                        <Td>{formatINR(tx.balanceAfter)}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </TableScroll>
              <Pagination page={txPage} pages={txPages} total={txTotal} onPageChange={setTxPage} />
            </>
          )}
        </Card>
      </Stack>
    </PageContainer>
  );
};

export default Wallet;
