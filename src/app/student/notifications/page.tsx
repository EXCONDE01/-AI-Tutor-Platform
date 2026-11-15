"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Bell } from "lucide-react";
import { Skeleton, CardSkeleton, PageHeaderSkeleton, ListItemSkeleton } from "@/components/ui/skeleton";

export default function StudentNotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setNotifications([]);
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <PageHeaderSkeleton showDescription />
        <CardSkeleton showHeader={false} showContent={false} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-6">Notifications</h1>
        <p className="text-muted-foreground">Your alerts and updates</p>
      </div>
      <Card>
        <CardContent className="py-6">
          {notifications.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No notifications yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((n, i) => (
                <ListItemSkeleton key={i} showAvatar showAction lines={2} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}