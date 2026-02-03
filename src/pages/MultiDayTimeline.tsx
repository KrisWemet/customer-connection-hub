import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Car, 
  Tent, 
  ChevronLeft, 
  Plus, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { SupabaseNotice } from '@/components/SupabaseNotice';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase, supabaseConfigured } from '@/lib/supabase/client';
import { eventDaysService, dailyActivitiesService, resourceAllocationsService, issueReportsService } from '@/lib/multi-day-event/service';
import type { EventDay, DailyActivity, ResourceAllocation, IssueReport } from '@/types/multi-day-event';
import type { Tables } from '@/types/supabase';

type Booking = Tables<'bookings'>;

const MultiDayTimeline = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Fetch booking details
  const { data: booking } = useQuery({
    queryKey: ['booking', id],
    enabled: supabaseConfigured && !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as Booking;
    },
  });

  // Fetch event days
  const { data: eventDays = [], isLoading: daysLoading } = useQuery({
    queryKey: ['event_days', id],
    enabled: supabaseConfigured && !!id,
    queryFn: () => eventDaysService.getByBookingId(id!),
  });

  // Fetch daily activities
  const { data: dailyActivities = {} } = useQuery({
    queryKey: ['daily_activities_by_day', id],
    enabled: supabaseConfigured && !!id && eventDays.length > 0,
    queryFn: async () => {
      const activities: Record<string, DailyActivity[]> = {};
      for (const day of eventDays) {
        activities[day.id] = await dailyActivitiesService.getByEventDayId(day.id);
      }
      return activities;
    },
  });

  // Fetch resource allocations
  const { data: resourceAllocations = {} } = useQuery({
    queryKey: ['resource_allocations_by_day', id],
    enabled: supabaseConfigured && !!id && eventDays.length > 0,
    queryFn: async () => {
      const allocations: Record<string, ResourceAllocation[]> = {};
      for (const day of eventDays) {
        allocations[day.id] = await resourceAllocationsService.getByBookingId(id!, day.id);
      }
      return allocations;
    },
  });

  // Fetch issue reports
  const { data: issueReports = {} } = useQuery({
    queryKey: ['issue_reports_by_day', id],
    enabled: supabaseConfigured && !!id && eventDays.length > 0,
    queryFn: async () => {
      const reports: Record<string, IssueReport[]> = {};
      for (const day of eventDays) {
        reports[day.id] = await issueReportsService.getByBookingId(id!, day.id);
      }
      return reports;
    },
  });

  // Set the first day as selected if none is selected
  useEffect(() => {
    if (eventDays.length > 0 && !selectedDay) {
      setSelectedDay(eventDays[0].id);
    }
  }, [eventDays, selectedDay]);

  if (!id) {
    return (
      <AppLayout>
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold text-destructive">Booking ID is required</h1>
        </div>
      </AppLayout>
    );
  }

  // Calculate stats for the timeline header
  const totalActivities = Object.values(dailyActivities).flat().length;
  const totalResources = Object.values(resourceAllocations).flat().length;
  const totalIssues = Object.values(issueReports).flat().length;
  const unresolvedIssues = Object.values(issueReports).flat().filter(issue => 
    issue.status !== 'resolved' && issue.status !== 'closed'
  ).length;

  return (
    <AppLayout>
      <div className="p-8 space-y-6">
        {!supabaseConfigured && <SupabaseNotice title="Supabase not configured. Data may not load." />}

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary">
            Home
          </Link>
          <span>//</span>
          <Link to="/events" className="hover:text-primary">
            Bookings
          </Link>
          <span>//</span>
          <Link to={`/bookings/${id}`} className="hover:text-primary">
            {booking?.client_name || 'Booking'} ({booking?.package_type})
          </Link>
          <span>//</span>
          <span>Multi-Day Timeline</span>
        </div>

        {/* Header */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-card space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-primary">Multi-Day Timeline</h1>
              <p className="text-muted-foreground">
                {booking?.client_name || 'Event'} • {booking?.package_type}
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ChevronLeft size={16} className="mr-2" />
              Back
            </Button>
          </div>
          
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-muted-foreground" />
              <span>
                {eventDays.length} days • {totalActivities} activities
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-muted-foreground" />
              <span>{totalResources} resources allocated</span>
            </div>
            <div className="flex items-center gap-2">
              {unresolvedIssues > 0 ? (
                <AlertTriangle size={16} className="text-amber-500" />
              ) : (
                <CheckCircle size={16} className="text-emerald-500" />
              )}
              <span>
                {totalIssues} issues • {unresolvedIssues} pending
              </span>
            </div>
          </div>
        </div>

        {/* Timeline Navigation */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="flex overflow-x-auto pb-2 -mx-2 px-2">
            {daysLoading ? (
              <div className="text-sm text-muted-foreground">Loading event days...</div>
            ) : eventDays.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No event days defined. <Link to={`/bookings/${id}`} className="text-primary underline">Add days to this booking</Link>.
              </div>
            ) : (
              <div className="flex gap-2 w-full">
                {eventDays.map((day) => {
                  const dayActivities = dailyActivities[day.id] || [];
                  const dayResources = resourceAllocations[day.id] || [];
                  const dayIssues = issueReports[day.id] || [];
                  const dayUnresolvedIssues = dayIssues.filter(issue => 
                    issue.status !== 'resolved' && issue.status !== 'closed'
                  ).length;

                  return (
                    <button
                      key={day.id}
                      onClick={() => setSelectedDay(day.id)}
                      className={`flex-shrink-0 flex flex-col items-center justify-center p-4 rounded-lg border min-w-[140px] transition-colors ${
                        selectedDay === day.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className="font-semibold text-foreground">
                        {new Date(day.day_date).toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className="text-lg font-bold text-primary">
                        {new Date(day.day_date).getDate()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(day.day_date).toLocaleDateString('en-US', { month: 'short' })}
                      </div>
                      <div className="mt-2 flex gap-1">
                        <Badge variant="secondary" className="h-5 px-2 text-xs">
                          {dayActivities.length} acts
                        </Badge>
                        {dayUnresolvedIssues > 0 && (
                          <Badge variant="destructive" className="h-5 px-2 text-xs">
                            {dayUnresolvedIssues} issues
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Day Details */}
        {selectedDay && (
          <Tabs defaultValue="timeline" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
              <TabsTrigger value="issues">Issues</TabsTrigger>
              <TabsTrigger value="activities">Activities</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar size={18} />
                    Day Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const day = eventDays.find(d => d.id === selectedDay);
                    if (!day) return <div>Day not found</div>;
                    
                    const dayActivities = dailyActivities[selectedDay] || [];
                    const dayResources = resourceAllocations[selectedDay] || [];
                    const dayIssues = issueReports[selectedDay] || [];
                    
                    return (
                      <div className="space-y-4">
                        <div className="rounded-lg border border-border p-4">
                          <h3 className="font-semibold text-foreground">{day.title}</h3>
                          <p className="text-sm text-muted-foreground">{day.description}</p>
                          <div className="mt-2 flex flex-wrap gap-4 text-xs">
                            <div className="flex items-center gap-1">
                              <Calendar size={12} className="text-muted-foreground" />
                              <span>{new Date(day.day_date).toLocaleDateString()}</span>
                            </div>
                            {day.start_time && (
                              <div className="flex items-center gap-1">
                                <Clock size={12} className="text-muted-foreground" />
                                <span>{day.start_time.substring(0, 5)}</span>
                              </div>
                            )}
                            {day.end_time && (
                              <div className="flex items-center gap-1">
                                <Clock size={12} className="text-muted-foreground" />
                                <span>- {day.end_time.substring(0, 5)}</span>
                              </div>
                            )}
                            {day.capacity && (
                              <div className="flex items-center gap-1">
                                <Users size={12} className="text-muted-foreground" />
                                <span>{day.capacity} guests</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid gap-3">
                          {dayActivities.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              No activities scheduled for this day
                            </div>
                          ) : (
                            [...dayActivities]
                              .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
                              .map((activity) => (
                                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-background">
                                  <div className="flex flex-col items-center mt-1">
                                    <Clock size={14} className="text-muted-foreground" />
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {activity.start_time?.substring(0, 5) || 'TBD'}
                                    </div>
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <h4 className="font-medium text-foreground">{activity.title}</h4>
                                      <Badge variant={activity.status === 'completed' ? 'default' : 
                                        activity.status === 'in_progress' ? 'secondary' : 
                                        activity.status === 'cancelled' ? 'destructive' : 'outline'}>
                                        {activity.status}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                                    <div className="mt-1 flex flex-wrap gap-2 text-xs">
                                      {activity.location && (
                                        <div className="flex items-center gap-1">
                                          <MapPin size={12} className="text-muted-foreground" />
                                          <span>{activity.location}</span>
                                        </div>
                                      )}
                                      {activity.assigned_to && (
                                        <div className="flex items-center gap-1">
                                          <Info size={12} className="text-muted-foreground" />
                                          <span>{activity.assigned_to}</span>
                                        </div>
                                      )}
                                      {activity.priority > 0 && (
                                        <Badge variant="secondary">Priority {activity.priority}</Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="resources" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin size={18} />
                    Resource Allocations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const dayResources = resourceAllocations[selectedDay] || [];
                    
                    return (
                      <div className="grid gap-4">
                        {dayResources.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            No resources allocated for this day
                          </div>
                        ) : (
                          dayResources.map((resource) => (
                            <div key={resource.id} className="rounded-lg border border-border p-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="font-semibold text-foreground">{resource.resource_name}</h3>
                                  <p className="text-sm text-muted-foreground">{resource.resource_type}</p>
                                  <p className="text-sm mt-1">{resource.allocated_for}</p>
                                </div>
                                <Badge variant="secondary">
                                  {new Date(resource.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                                  {new Date(resource.end_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Badge>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                {resource.capacity && (
                                  <div className="flex items-center gap-1">
                                    <Users size={12} className="text-muted-foreground" />
                                    <span>{resource.capacity} capacity</span>
                                  </div>
                                )}
                                {resource.setup_instructions && (
                                  <div className="flex items-center gap-1">
                                    <Info size={12} className="text-muted-foreground" />
                                    <span>Setup instructions</span>
                                  </div>
                                )}
                              </div>
                              {resource.notes && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  <strong>Notes:</strong> {resource.notes}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="issues" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {(() => {
                      const dayIssues = issueReports[selectedDay] || [];
                      const unresolved = dayIssues.filter(i => 
                        i.status !== 'resolved' && i.status !== 'closed'
                      ).length;
                      
                      return (
                        <>
                          {unresolved > 0 ? <AlertTriangle size={18} className="text-amber-500" /> : 
                           <CheckCircle size={18} className="text-emerald-500" />}
                          Issues & Problems
                        </>
                      );
                    })()}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const dayIssues = issueReports[selectedDay] || [];
                    
                    return (
                      <div className="grid gap-4">
                        {dayIssues.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            No issues reported for this day
                          </div>
                        ) : (
                          dayIssues.map((issue) => (
                            <div 
                              key={issue.id} 
                              className={`rounded-lg border p-4 ${
                                issue.severity === 'critical' ? 'border-red-500 bg-red-50' :
                                issue.severity === 'high' ? 'border-amber-500 bg-amber-50' :
                                issue.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                                'border-border bg-background'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="font-semibold text-foreground">{issue.title}</h3>
                                  <p className="text-sm">{issue.description}</p>
                                </div>
                                <div className="flex flex-col items-end">
                                  <Badge 
                                    variant={issue.status === 'resolved' || issue.status === 'closed' ? 'default' : 
                                      issue.status === 'in_progress' ? 'secondary' : 
                                      issue.status === 'acknowledged' ? 'outline' : 'destructive'}
                                  >
                                    {issue.status}
                                  </Badge>
                                  <Badge 
                                    className="mt-1" 
                                    variant={issue.severity === 'critical' ? 'destructive' : 
                                      issue.severity === 'high' ? 'default' : 
                                      issue.severity === 'medium' ? 'secondary' : 'outline'}
                                  >
                                    {issue.severity}
                                  </Badge>
                                </div>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                {issue.assigned_to && (
                                  <div className="flex items-center gap-1">
                                    <Info size={12} className="text-muted-foreground" />
                                    <span>Assigned to: {issue.assigned_to}</span>
                                  </div>
                                )}
                                {issue.resolved_at && (
                                  <div className="flex items-center gap-1">
                                    <CheckCircle size={12} className="text-muted-foreground" />
                                    <span>Resolved: {new Date(issue.resolved_at).toLocaleDateString()}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activities" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock size={18} />
                    All Activities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" asChild>
                    <Link to={`/bookings/${id}/activities`}>
                      <Plus size={16} className="mr-2" />
                      Add Activity
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-800">
                <Calendar size={20} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Event Days</p>
                <p className="text-2xl font-bold">{eventDays.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-800">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Activities</p>
                <p className="text-2xl font-bold">{totalActivities}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 text-purple-800">
                <MapPin size={20} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Resources</p>
                <p className="text-2xl font-bold">{totalResources}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                unresolvedIssues > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {unresolvedIssues > 0 ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Issues</p>
                <p className="text-2xl font-bold">{unresolvedIssues}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default MultiDayTimeline;