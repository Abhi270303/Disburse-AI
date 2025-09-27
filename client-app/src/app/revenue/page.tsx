"use client";
import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  ExternalLink,
  Download,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import {
  getTransactionExplorerUrl,
  getAddressExplorerUrl,
} from "@/lib/constants";

const Page = () => {
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const transactionsPerPage = 5;

  // Sample completed transaction data
  const revenueData = [
    {
      id: 1,
      amount: 25.5,
      token: "USDC",
      network: "Ethereum",
      chainId: 1,
      txHash:
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      from: "0xAbcdEFgh1234567890AbcdEFgh1234567890abcd",
      to: "0x1234567890abcdef1234567890abcdef1234567890",
      status: "completed",
      date: "2024-01-15",
      time: "14:30:22",
    },
    {
      id: 2,
      amount: 99.99,
      token: "USDT",
      network: "Polygon",
      chainId: 137,
      txHash:
        "0x2345678901bcdef12345678901bcdef12345678901bcdef12345678901bcdef",
      from: "0xBcdeFGhi1234567890BcdeFGhi1234567890bcde",
      to: "0xabcdef1234567890abcdef1234567890abcdef12",
      status: "completed",
      date: "2024-01-14",
      time: "09:15:45",
    },
    {
      id: 3,
      amount: 150.0,
      token: "USDC",
      network: "Arbitrum",
      chainId: 42161,
      txHash:
        "0x3456789012cdef123456789012cdef123456789012cdef123456789012cdef",
      from: "0xCdefGHij1234567890CdefGHij1234567890cdef",
      to: "0x567890abcdef1234567890abcdef1234567890ab",
      status: "completed",
      date: "2024-01-13",
      time: "16:45:33",
    },
    {
      id: 4,
      amount: 75.25,
      token: "DAI",
      network: "Optimism",
      chainId: 10,
      txHash: "0x4567890123def1234567890123def1234567890123def1234567890123def",
      from: "0xDefgHIjk1234567890DefgHIjk1234567890defg",
      to: "0x7890abcdef1234567890abcdef1234567890abcd",
      status: "completed",
      date: "2024-01-12",
      time: "11:20:18",
    },
    {
      id: 5,
      amount: 200.0,
      token: "USDC",
      network: "Morph Holesky",
      chainId: 2810,
      txHash: "0x5678901234ef12345678901234ef12345678901234ef12345678901234ef",
      from: "0xEfghIJkl1234567890EfghIJkl1234567890efgh",
      to: "0x9012abcdef1234567890abcdef1234567890ef",
      status: "completed",
      date: "2024-01-11",
      time: "13:55:42",
    },
    {
      id: 6,
      amount: 45.75,
      token: "USDT",
      network: "Ethereum",
      chainId: 1,
      txHash: "0x6789012345f123456789012345f123456789012345f123456789012345f",
      from: "0xFghiJKlm1234567890FghiJKlm1234567890fghi",
      to: "0x1234bcdef1234567890bcdef1234567890bcdef1",
      status: "completed",
      date: "2024-01-10",
      time: "08:30:15",
    },
    {
      id: 7,
      amount: 120.5,
      token: "USDC",
      network: "Polygon",
      chainId: 137,
      txHash:
        "0x7890123456g1234567890123456g1234567890123456g1234567890123456g",
      from: "0xGhijKLmn1234567890GhijKLmn1234567890ghij",
      to: "0x3456cdef1234567890cdef1234567890cdef123",
      status: "completed",
      date: "2024-01-09",
      time: "15:20:30",
    },
    {
      id: 8,
      amount: 88.88,
      token: "DAI",
      network: "Arbitrum",
      chainId: 42161,
      txHash:
        "0x8901234567h12345678901234567h12345678901234567h12345678901234567h",
      from: "0xHijkLMno1234567890HijkLMno1234567890hijk",
      to: "0x5678def1234567890def1234567890def12345",
      status: "completed",
      date: "2024-01-08",
      time: "12:45:22",
    },
  ];

  const totalRevenue = revenueData.reduce((sum, row) => sum + row.amount, 0);
  const totalTransactions = revenueData.length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge
            variant="secondary"
            className="bg-green-100 text-green-800 border-green-200"
          >
            Completed
          </Badge>
        );
      case "pending":
        return (
          <Badge
            variant="secondary"
            className="bg-yellow-100 text-yellow-800 border-yellow-200"
          >
            Pending
          </Badge>
        );
      case "failed":
        return (
          <Badge
            variant="secondary"
            className="bg-red-100 text-red-800 border-red-200"
          >
            Failed
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Filter and search logic
  const filteredData = revenueData.filter((row) => {
    const matchesFilter =
      selectedFilter === "all" || row.status === selectedFilter;
    const matchesSearch =
      searchQuery === "" ||
      row.txHash.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.to.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.token.toLowerCase().includes(searchQuery.toLowerCase()) ||
      row.network.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / transactionsPerPage);
  const startIndex = (currentPage - 1) * transactionsPerPage;
  const endIndex = startIndex + transactionsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearch = () => {
    setCurrentPage(1); // Reset to first page when searching
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground mb-1">
            Revenue
          </h1>
          <p className="text-sm text-muted-foreground">
            You have {revenueData.length} transactions ready to withdraw
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-accent/10 backdrop-blur rounded-none p-6 border border-border/50">
            <p className="text-sm text-muted-foreground font-mono mb-2">
              TOTAL REVENUE
            </p>
            <p className="text-3xl font-light">${totalRevenue.toFixed(2)}</p>
          </div>
          <div className="bg-muted/30 backdrop-blur rounded-none p-6 border border-border/50">
            <p className="text-sm text-muted-foreground font-mono mb-2">
              TRANSACTIONS
            </p>
            <p className="text-3xl font-light">{totalTransactions}</p>
          </div>
          <div className="bg-foreground text-background rounded-none p-6">
            <p className="text-sm text-background/60 font-mono mb-2">
              AVG PER TX
            </p>
            <p className="text-3xl font-light">
              $
              {totalTransactions > 0
                ? (totalRevenue / totalTransactions).toFixed(2)
                : "0.00"}
            </p>
          </div>
        </div>

        {/* Filters, Search and Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {/* Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-none font-mono"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {selectedFilter === "all"
                    ? "All Transactions"
                    : selectedFilter === "completed"
                    ? "Completed"
                    : selectedFilter === "pending"
                    ? "Pending"
                    : "Failed"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="rounded-none">
                <DropdownMenuItem onClick={() => setSelectedFilter("all")}>
                  All Transactions
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSelectedFilter("completed")}
                >
                  Completed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedFilter("pending")}>
                  Pending
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedFilter("failed")}>
                  Failed
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Search */}
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 rounded-none font-mono text-sm"
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button
                variant="outline"
                size="sm"
                className="rounded-none font-mono"
                onClick={handleSearch}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="rounded-none font-mono"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Table */}
        <div className="bg-background border border-border/50 rounded-none overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead className="font-mono text-xs">Amount</TableHead>
                <TableHead className="font-mono text-xs">Token</TableHead>
                <TableHead className="font-mono text-xs">Network</TableHead>
                <TableHead className="font-mono text-xs">Status</TableHead>
                <TableHead className="font-mono text-xs">Date</TableHead>
                <TableHead className="font-mono text-xs">Tx Hash</TableHead>
                <TableHead className="font-mono text-xs">From</TableHead>
                <TableHead className="font-mono text-xs">To</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentData.map((row, index) => (
                <TableRow
                  key={row.id}
                  className={
                    index === currentData.length - 1
                      ? "border-b-0"
                      : "border-border/50"
                  }
                >
                  <TableCell className="font-medium">
                    ${row.amount.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono">
                    {row.token}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm font-mono">
                    {row.network}
                  </TableCell>
                  <TableCell>{getStatusBadge(row.status)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm font-mono">
                    {row.date}
                    <br />
                    <span className="text-xs">{row.time}</span>
                  </TableCell>
                  <TableCell>
                    <a
                      href={getTransactionExplorerUrl(
                        row.txHash,
                        row.network,
                        row.chainId
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground text-sm font-mono transition-colors flex items-center gap-1"
                      title={row.txHash}
                    >
                      {`${row.txHash.slice(0, 8)}...${row.txHash.slice(-6)}`}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </TableCell>
                  <TableCell>
                    <a
                      href={getAddressExplorerUrl(
                        row.from,
                        row.network,
                        row.chainId
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground text-sm font-mono transition-colors flex items-center gap-1"
                      title={row.from}
                    >
                      {`${row.from.slice(0, 6)}...${row.from.slice(-4)}`}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </TableCell>
                  <TableCell>
                    <a
                      href={getAddressExplorerUrl(
                        row.to,
                        row.network,
                        row.chainId
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground text-sm font-mono transition-colors flex items-center gap-1"
                      title={row.to}
                    >
                      {`${row.to.slice(0, 6)}...${row.to.slice(-4)}`}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </TableCell>
                </TableRow>
              ))}
              {currentData.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-32 text-center text-muted-foreground font-mono"
                  >
                    No transactions found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-muted-foreground font-mono">
              Showing {startIndex + 1} to{" "}
              {Math.min(endIndex, filteredData.length)} of {filteredData.length}{" "}
              results
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-none font-mono"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-none font-mono"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      className="rounded-none font-mono w-8 h-8 p-0"
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </Button>
                  )
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="rounded-none font-mono"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-none font-mono"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Page;
