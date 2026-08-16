import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getPlatformWallet, listPlatformWalletTransactions } from "../../api/admin";
import { PageContainer, SectionTitle, Stack, Muted, EmptyState } from "../../components/ui/Layout";
import { Card, CardRow } from "../../components/ui/Card";
import { SkeletonBlock, SkeletonText, SkeletonTableRows } from "../../components/ui/Skeleton";
import { Pagination } from "../../components/ui/Pagination";
import { TableScroll, Table, Th, Td, Tr, IndexTh, IndexTd } from "../../components/ui/AdminTable";
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

      <Stack $gap={4} style={{ marginTop: 20 }}>
        <Card>
          {loadingWallet ? (
            <CardRow>
              <Stack $gap={1}>
                <SkeletonBlock $width="180px" $height="14px" />
                <SkeletonBlock $width="320px" $height="12px" />
              </Stack>
              <SkeletonText $width="110px" $size="28px" />
            </CardRow>
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
          {!loadingTx && items.length === 0 ? (
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
                    {loadingTx ? (
                      <SkeletonTableRows rows={6} cols={5} />
                    ) : (
                      items.map((tx, i) => (
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
                      ))
                    )}
                  </tbody>
                </Table>
              </TableScroll>
              {!loadingTx && <Pagination page={page} pages={pages} total={total} onPageChange={setPage} />}
            </>
          )}
        </Card>
      </Stack>
    </PageContainer>
  );
};

export default PlatformWallet;
