import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect, useRef } from "react";
import {
  listReplies,
  overrideReplyClassification,
  deleteReply,
  deleteReplies,
  markRepliesRead,
  sendReplyMessage,
} from "@/lib/replies.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDateTime } from "@/lib/format";
import { toast } from "sonner";
import {
  Flame,
  Inbox,
  Search,
  Trash2,
  Send,
  Reply as ReplyIcon,
  X,
  MailOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/replies")({
  component: RepliesPage,
});

const LABELS: Record<string, string> = {
  hot_lead: "Hot lead",
  interested: "Interested",
  no_longer_owns: "No longer owns",
  unsubscribe: "Unsubscribed",
  replied: "Other reply",
};

const FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "hot_lead", label: "Hot leads" },
  { value: "interested", label: "Interested" },
  { value: "replied", label: "Other" },
  { value: "no_longer_owns", label: "No longer owns" },
  { value: "unsubscribe", label: "Unsubscribed" },
];

function classBadge(c: string) {
  const variants: Record<string, string> = {
    hot_lead: "bg-orange-100 text-orange-800 border-orange-200",
    interested: "bg-blue-100 text-blue-800 border-blue-200",
    no_longer_owns: "bg-gray-100 text-gray-700 border-gray-200",
    unsubscribe: "bg-red-100 text-red-800 border-red-200",
    replied: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return variants[c] ?? variants.replied;
}

function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function RepliesPage() {
  const qc = useQueryClient();
  const fetch = useServerFn(listReplies);
  const override = useServerFn(overrideReplyClassification);
  const del = useServerFn(deleteReply);
  const delMany = useServerFn(deleteReplies);
  const markRead = useServerFn(markRepliesRead);
  const send = useServerFn(sendReplyMessage);

  const { data: replies = [], isLoading } = useQuery({
    queryKey: ["replies"],
    queryFn: () => fetch(),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [replySubject, setReplySubject] = useState("");
  const markedRef = useRef<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (replies as any[]).filter((r) => {
      if (filter === "unread") {
        if (r.read_at) return false;
      } else if (filter !== "all" && r.classification !== filter) return false;
      if (!q) return true;
      return (
        r.customer?.name?.toLowerCase().includes(q) ||
        r.from_email?.toLowerCase().includes(q) ||
        r.subject?.toLowerCase().includes(q) ||
        r.raw_text?.toLowerCase().includes(q) ||
        r.summary?.toLowerCase().includes(q)
      );
    });
  }, [replies, filter, search]);

  const selected = useMemo(
    () => (replies as any[]).find((r) => r.id === selectedId) ?? null,
    [replies, selectedId],
  );

  const unreadCount = useMemo(
    () => (replies as any[]).filter((r) => !r.read_at).length,
    [replies],
  );

  useEffect(() => {
    if (!selected && filtered.length > 0) setSelectedId(filtered[0].id);
  }, [filtered, selected]);

  const markReadMut = useMutation({
    mutationFn: (ids: string[]) => markRead({ data: { ids, read: true } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["replies"] }),
  });

  // Auto-mark selected as read once
  useEffect(() => {
    if (selected && !selected.read_at && !markedRef.current.has(selected.id)) {
      markedRef.current.add(selected.id);
      markReadMut.mutate([selected.id]);
    }
  }, [selected, markReadMut]);

  const overrideMut = useMutation({
    mutationFn: (v: { id: string; classification: any }) => override({ data: v }),
    onSuccess: () => {
      toast.success("Classification updated");
      qc.invalidateQueries({ queryKey: ["replies"] });
      qc.invalidateQueries({ queryKey: ["hot-leads"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Reply deleted");
      setSelectedId(null);
      qc.invalidateQueries({ queryKey: ["replies"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to delete"),
  });

  const bulkDeleteMut = useMutation({
    mutationFn: (ids: string[]) => delMany({ data: { ids } }),
    onSuccess: (_d, ids) => {
      toast.success(`Deleted ${ids.length} ${ids.length === 1 ? "reply" : "replies"}`);
      setChecked(new Set());
      if (selectedId && ids.includes(selectedId)) setSelectedId(null);
      qc.invalidateQueries({ queryKey: ["replies"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to delete"),
  });

  const bulkMarkReadMut = useMutation({
    mutationFn: (ids: string[]) => markRead({ data: { ids, read: true } }),
    onSuccess: () => {
      setChecked(new Set());
      qc.invalidateQueries({ queryKey: ["replies"] });
    },
  });

  const sendMut = useMutation({
    mutationFn: (v: { replyId: string; body: string; subject?: string }) =>
      send({ data: v }),
    onSuccess: () => {
      toast.success("Reply sent");
      setComposeOpen(false);
      setReplyBody("");
      setReplySubject("");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to send"),
  });

  const openCompose = () => {
    if (!selected) return;
    setReplySubject(
      selected.subject
        ? selected.subject.toLowerCase().startsWith("re:")
          ? selected.subject
          : `Re: ${selected.subject}`
        : "Re: your message",
    );
    setReplyBody("");
    setComposeOpen(true);
  };

  const toggleCheck = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allVisibleChecked =
    filtered.length > 0 && filtered.every((r: any) => checked.has(r.id));
  const someVisibleChecked = filtered.some((r: any) => checked.has(r.id));

  const toggleAll = () => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (allVisibleChecked) {
        filtered.forEach((r: any) => next.delete(r.id));
      } else {
        filtered.forEach((r: any) => next.add(r.id));
      }
      return next;
    });
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Inbox className="h-6 w-6" /> Inbox
            {unreadCount > 0 && (
              <Badge className="bg-primary text-primary-foreground ml-1">
                {unreadCount} unread
              </Badge>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Inbound replies, AI-classified. Reply directly or clean up your inbox.
          </p>
        </div>
      </div>

      <Card className="overflow-hidden bg-white">
        <div className="flex flex-col md:flex-row md:h-[calc(100vh-220px)] md:min-h-[520px]">
          {/* List */}
          <div className="md:w-[400px] md:border-r flex flex-col min-h-0 bg-white">
            <div className="p-3 border-b space-y-2 bg-white">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search replies…"
                  className="pl-8 h-9"
                />
              </div>
              <div className="flex gap-1 flex-wrap">
                {FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFilter(f.value)}
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-full border transition",
                      filter === f.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted",
                    )}
                  >
                    {f.label}
                    {f.value === "unread" && unreadCount > 0 && (
                      <span className="ml-1 opacity-70">{unreadCount}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Bulk toolbar */}
            <div className="px-3 py-2 border-b bg-white flex items-center gap-2">
              <Checkbox
                checked={
                  allVisibleChecked
                    ? true
                    : someVisibleChecked
                      ? "indeterminate"
                      : false
                }
                onCheckedChange={toggleAll}
                aria-label="Select all"
              />
              <span className="text-xs text-muted-foreground">
                {checked.size > 0 ? `${checked.size} selected` : "Select all"}
              </span>
              {checked.size > 0 && (
                <div className="ml-auto flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() => bulkMarkReadMut.mutate(Array.from(checked))}
                    disabled={bulkMarkReadMut.isPending}
                    title="Mark as read"
                  >
                    <MailOpen className="h-3.5 w-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-destructive hover:text-destructive"
                        title="Delete selected"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Delete {checked.size} {checked.size === 1 ? "reply" : "replies"}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes them from your inbox. Customer records are not affected.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => bulkDeleteMut.mutate(Array.from(checked))}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>

            <div className="overflow-y-auto flex-1 divide-y bg-white">
              {isLoading && (
                <div className="px-4 py-8 text-sm text-muted-foreground text-center">
                  Loading…
                </div>
              )}
              {!isLoading && filtered.length === 0 && (
                <div className="px-4 py-12 text-sm text-muted-foreground text-center">
                  No replies match.
                </div>
              )}
              {filtered.map((r: any) => {
                const isUnread = !r.read_at;
                const isChecked = checked.has(r.id);
                return (
                  <div
                    key={r.id}
                    className={cn(
                      "px-3 py-3 hover:bg-muted/40 transition flex items-start gap-2 cursor-pointer relative",
                      selectedId === r.id && "bg-muted/60",
                      isUnread && "bg-blue-50/40",
                    )}
                    onClick={() => setSelectedId(r.id)}
                  >
                    {isUnread && (
                      <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                    )}
                    <div
                      className="pt-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleCheck(r.id)}
                        aria-label="Select reply"
                      />
                    </div>
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium flex-shrink-0">
                      {initials(r.customer?.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-sm truncate",
                            isUnread ? "font-semibold text-foreground" : "font-medium",
                          )}
                        >
                          {r.customer?.name ?? r.from_email ?? "Unknown"}
                        </span>
                        {r.classification === "hot_lead" && (
                          <Flame className="h-3.5 w-3.5 text-orange-600 flex-shrink-0" />
                        )}
                        {isUnread && (
                          <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </div>
                      <div
                        className={cn(
                          "text-xs truncate mt-0.5",
                          isUnread ? "text-foreground/90 font-medium" : "text-muted-foreground",
                        )}
                      >
                        {r.subject || "(no subject)"}
                      </div>
                      <div className="text-xs text-muted-foreground/80 truncate mt-0.5">
                        {r.summary || r.raw_text?.slice(0, 80) || ""}
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-1.5">
                        <Badge
                          className={cn(classBadge(r.classification), "border text-[10px] py-0 px-1.5")}
                        >
                          {LABELS[r.classification] ?? r.classification}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDateTime(r.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detail */}
          <div className="flex-1 flex flex-col min-h-0 bg-white">
            {!selected ? (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                Select a reply to read it.
              </div>
            ) : (
              <>
                <div className="p-4 border-b space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {selected.subject || "(no subject)"}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                        <Link
                          to="/sequences/$id"
                          params={{ id: selected.sequence_id }}
                          className="hover:underline font-medium text-foreground"
                        >
                          {selected.customer?.name ?? "Unknown"}
                        </Link>
                        {selected.from_email && (
                          <span className="text-xs">&lt;{selected.from_email}&gt;</span>
                        )}
                        {(selected.customer?.make || selected.customer?.model) && (
                          <span className="text-xs">
                            · {selected.customer?.make} {selected.customer?.model}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDateTime(selected.created_at)}
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="flex-shrink-0">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this reply?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This removes the reply from your inbox. The customer record is not affected.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMut.mutate(selected.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={cn(classBadge(selected.classification), "border")}>
                      {LABELS[selected.classification] ?? selected.classification}
                    </Badge>
                    {selected.manual_override && (
                      <Badge variant="outline" className="text-xs">manual</Badge>
                    )}
                    {selected.confidence != null && !selected.manual_override && (
                      <span className="text-xs text-muted-foreground">
                        {Math.round(selected.confidence * 100)}% confident
                      </span>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                      <Select
                        value={selected.classification}
                        onValueChange={(v) =>
                          overrideMut.mutate({ id: selected.id, classification: v })
                        }
                      >
                        <SelectTrigger className="h-8 w-40 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        onClick={openCompose}
                        disabled={!selected.from_email && !selected.customer?.email}
                      >
                        <ReplyIcon className="h-4 w-4 mr-1.5" /> Reply
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="overflow-y-auto flex-1 p-4 space-y-3">
                  {selected.summary && (
                    <div className="text-sm bg-muted/40 rounded p-3">
                      <span className="text-muted-foreground">AI summary:</span>{" "}
                      {selected.summary}
                    </div>
                  )}
                  {selected.next_car_notes && (
                    <div className="text-sm text-orange-900 bg-orange-50 border border-orange-200 rounded p-3">
                      <strong>Next-car mention:</strong> {selected.next_car_notes}
                    </div>
                  )}
                  <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">
                    {selected.raw_text || "(no message body)"}
                  </pre>
                </div>

                {composeOpen && (
                  <div className="border-t p-4 space-y-2 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">
                        Reply to {selected.customer?.name ?? selected.from_email}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setComposeOpen(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Input
                      value={replySubject}
                      onChange={(e) => setReplySubject(e.target.value)}
                      placeholder="Subject"
                      className="h-9"
                    />
                    <Textarea
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      placeholder="Type your reply…"
                      rows={6}
                      className="resize-none"
                    />
                    <div className="flex justify-end">
                      <Button
                        onClick={() =>
                          sendMut.mutate({
                            replyId: selected.id,
                            body: replyBody,
                            subject: replySubject,
                          })
                        }
                        disabled={!replyBody.trim() || sendMut.isPending}
                      >
                        <Send className="h-4 w-4 mr-1.5" />
                        {sendMut.isPending ? "Sending…" : "Send"}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
