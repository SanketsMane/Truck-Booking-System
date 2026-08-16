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
  getMyPayoutMethod,
} from "../api/wallet";
import { useAuth } from "../context/AuthContext";
import { useBranding } from "../context/BrandingContext";
import { openRazorpayCheckout } from "../utils/razorpayCheckout";
import { PageContainer, SectionTitle, Stack, Row, Muted, EmptyState } from "../components/ui/Layout";
import { Card, CardRow } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Field, Input, Select } from "../components/ui/Form";
import { StatusBadge } from "../components/ui/Badge";
import { SkeletonBlock, SkeletonText, SkeletonTableRows } from "../components/ui/Skeleton";
import { Pagination } from "../components/ui/Pagination";
import { TableScroll, Table, Th, Td, Tr, IndexTh, IndexTd } from "../components/ui/Table";
import { Toolbar, ToolbarSelect, ToolbarSpacer, ResultsCount, ClearFiltersButton } from "../components/ui/Toolbar";
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
  const { platformName } = useBranding();
  const isTransporter = user?.roles?.includes("transporter");

  const [wallet, setWallet] = useState(null);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [recharging, setRecharging] = useState(false);

  const [txItems, setTxItems] = useState([]);
  const [txPage, setTxPage] = useState(1);
  const [txPageSize, setTxPageSize] = useState(20);
  const [txPages, setTxPages] = useState(1);
  const [txTotal, setTxTotal] = useState(0);
  const [txType, setTxType] = useState("");
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
  const [prefilledFromSaved, setPrefilledFromSaved] = useState(false);

  const loadWallet = () =>
    getMyWallet()
      .then(({ wallet }) => setWallet(wallet))
      .catch((error) => toast.error(error.message))
      .finally(() => setLoadingWallet(false));

  const loadTransactions = (page, pageSize, type) =>
    listMyTransactions({ page, limit: pageSize, type: type || undefined })
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

  // Prefill the withdrawal form from the transporter's saved payout method
  // (set on Profile) so they don't have to retype it every time — still
  // fully editable/overridable per request.
  useEffect(() => {
    if (!isTransporter) return;
    getMyPayoutMethod()
      .then(({ payoutMethod: saved }) => {
        if (!saved) return;
        setPayoutMethod(saved.method);
        if (saved.method === "upi") setUpiId(saved.upiId || "");
        if (saved.method === "bank") {
          setAccountHolderName(saved.bankDetails?.accountHolderName || "");
          setAccountNumber(saved.bankDetails?.accountNumber || "");
          setIfscCode(saved.bankDetails?.ifscCode || "");
        }
        setPrefilledFromSaved(true);
      })
      .catch(() => {});
  }, [isTransporter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingTx(true);
    loadTransactions(txPage, txPageSize, txType);
  }, [txPage, txPageSize, txType]);

  const handleTypeChange = (e) => {
    setTxType(e.target.value);
    setTxPage(1);
  };

  const clearTxFilters = () => {
    setTxType("");
    setTxPage(1);
  };

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
        name: platformName,
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
      await Promise.all([loadWallet(), loadTransactions(1, txPageSize, txType)]);
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
      await Promise.all([loadWallet(), loadWithdrawals(), loadTransactions(1, txPageSize, txType)]);
      setTxPage(1);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubmittingWithdrawal(false);
    }
  };

  return (
    <PageContainer style={{ maxWidth: 780 }}>

      <Stack $gap={4} style={{ marginTop: 20 }}>
        <Card>
          {loadingWallet ? (
            <BalanceRow>
              <Row $gap={3}>
                <SkeletonBlock $width="44px" $height="44px" $radius="16px" />
                <Stack $gap={1}>
                  <SkeletonBlock $width="90px" $height="12px" />
                  <SkeletonText $width="140px" $size="30px" />
                </Stack>
              </Row>
            </BalanceRow>
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
              {prefilledFromSaved && (
                <Muted>Prefilled from your saved payout method — edit here anytime, or update it from your Profile.</Muted>
              )}
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

        <Stack $gap={3}>
          <SectionTitle>Transaction history</SectionTitle>
          <Toolbar>
            <ToolbarSelect value={txType} onChange={handleTypeChange}>
              <option value="">All types</option>
              {Object.entries(TX_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </ToolbarSelect>
            <ToolbarSpacer />
            {txType && <ClearFiltersButton onClick={clearTxFilters} />}
            {!loadingTx && <ResultsCount>{txTotal} transaction{txTotal === 1 ? "" : "s"}</ResultsCount>}
          </Toolbar>
        </Stack>

        <Card $padding="0">
          {loadingTx ? (
            <TableScroll>
              <Table $minWidth="620px">
                <thead>
                  <tr>
                    <IndexTh>#</IndexTh>
                    <Th>Date</Th>
                    <Th>Type</Th>
                    <Th>Amount (₹)</Th>
                    <Th>Balance after (₹)</Th>
                  </tr>
                </thead>
                <tbody>
                  <SkeletonTableRows rows={txPageSize > 10 ? 10 : txPageSize} cols={5} />
                </tbody>
              </Table>
            </TableScroll>
          ) : txItems.length === 0 ? (
            <EmptyState style={{ margin: "0 20px 20px" }}>
              <Muted>{txType ? "No transactions match this filter." : "No wallet activity yet."}</Muted>
            </EmptyState>
          ) : (
            <>
              <TableScroll>
                <Table $minWidth="620px">
                  <thead>
                    <tr>
                      <IndexTh>#</IndexTh>
                      <Th>Date</Th>
                      <Th>Type</Th>
                      <Th>Amount (₹)</Th>
                      <Th>Balance after (₹)</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {txItems.map((tx, i) => (
                      <Tr key={tx._id}>
                        <IndexTd>{(txPage - 1) * txPageSize + i + 1}</IndexTd>
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
              <div style={{ padding: "0 20px 16px" }}>
                <Pagination
                  page={txPage}
                  pages={txPages}
                  total={txTotal}
                  onPageChange={setTxPage}
                  pageSize={txPageSize}
                  onPageSizeChange={(n) => {
                    setTxPageSize(n);
                    setTxPage(1);
                  }}
                />
              </div>
            </>
          )}
        </Card>
      </Stack>
    </PageContainer>
  );
};

export default Wallet;
