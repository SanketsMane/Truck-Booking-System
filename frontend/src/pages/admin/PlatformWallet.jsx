import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getPlatformWallet, listPlatformWalletTransactions } from "../../api/admin";
import { PageContainer, PageTitle, SectionTitle, Stack, Row, Muted, EmptyState } from "../../components/ui/Layout";
import { Card, CardRow } from "../../components/ui/Card";
import { Spinner } from "../../components/ui/Spinner";
import { Pagination } from "../../components/ui/Pagination";
import { TableScroll, Table, Th, Td, Tr, IndexTh, IndexTd } from "../../components/ui/Table";
import { formatINR, formatDateTime } from "../../utils/format";

const TX_LABELS = {
  commission_earned: "Commission earned",
  adjustment: "Manual adjustment",
};

export const PlatformWallet = () => {
  const [wallet, setWallet] = useState(null);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loadingTx, setLoadingTx] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getPlatformWallet()
      .then(({ wallet }) => {
        if (!cancelled) setWallet(wallet);
      })
      .catch((error) => {
        if (!cancelled) toast.error(error.message);
      })
      .finally(() => {
        if (!cancelled) setLoadingWallet(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    listPlatformWalletTransactions({ page, limit: 20 })
      .then((res) => {
        if (cancelled) return;
        setItems(res.items || []);
        setTotal(res.total || 0);
        setPages(res.pages || 1);
      })
      .catch((error) => {
        if (!cancelled) toast.error(error.message);
      })
      .finally(() => {
        if (!cancelled) setLoadingTx(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  return (
    <PageContainer style={{ maxWidth: 1080 }}>
      <PageTitle>Platform wallet</PageTitle>

      <Stack $gap={4} style={{ marginTop: 20 }}>
        <Card>
          {loadingWallet ? (
            <Row style={{ justifyContent: "center", padding: "20px 0" }}>
              <Spinner $size={24} />
            </Row>
          ) : (
            <CardRow>
              <Stack $gap={1}>
                <SectionTitle>Total commission earned</SectionTitle>
                <Muted>The platform's cut of every completed booking, per the commission % set in Settings.</Muted>
              </Stack>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{formatINR(wallet?.balance)}</div>
            </CardRow>
          )}
        </Card>

        <Card>
          <SectionTitle style={{ marginBottom: 16 }}>Ledger</SectionTitle>
          {loadingTx ? (
            <Row style={{ justifyContent: "center", padding: "40px 0" }}>
              <Spinner $size={24} />
            </Row>
          ) : items.length === 0 ? (
            <EmptyState>
              <Muted>No platform wallet activity yet.</Muted>
            </EmptyState>
          ) : (
            <>
              <TableScroll>
                <Table $minWidth="640px">
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
                    {items.map((tx, i) => (
                      <Tr key={tx._id}>
                        <IndexTd>{(page - 1) * 20 + i + 1}</IndexTd>
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
              <Pagination page={page} pages={pages} total={total} onPageChange={setPage} />
            </>
          )}
        </Card>
      </Stack>
    </PageContainer>
  );
};

export default PlatformWallet;
