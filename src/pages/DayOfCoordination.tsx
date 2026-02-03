import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Car, 
  Tent, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Phone, 
  Mail, 
  Wrench, 
  ClipboardList,
  Camera,
  Bell,
  Plus,
  Search,
  Filter
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { SupabaseNotice } from '@/components/SupabaseNotice';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { supabase, supabaseConfigured } from '@/lib/supabase/client';
import { 
  eventDaysService, 
  dailyActivitiesService, 
  checklistItemsService, 
  emergencyContactsService, 
  issueReportsService 
} from '@/lib/multi-day-event/service';
import type { EventDay, DailyActivity, ChecklistItem, EmergencyContact, IssueReport } from '@/types/multi-day-event';
import type { Tables } from '@/types/supabase';

type Booking = Tables<'bookings'>;

const DayOfCoordination = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [activeTab, setActiveTab] = useState('overview');

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

  // Fetch checklists and items
  const { data: checklists = {} } = useQuery({
    queryKey: ['checklists_by_day', id],
    enabled: supabaseConfigured && !!id && eventDays.length > 0,
    queryFn: async () => {
      const lists: Record<string, any[]> = {};
      for (const day of eventDays) {
        lists[day.id] = await supabase
          .from('event_checklists')
          .select(`
            *,
            checklist_items (*)
          `)
          .eq('booking_id', id!)
          .eq('event_day_id', day.id)
          .order('name', { ascending: true });
      }
      return lists;
    },
  });

  // Fetch emergency contacts
  const { data: emergencyContacts = [] } = useQuery({
    queryKey: ['emergency_contacts', id],
    enabled: supabaseConfigured && !!id,
    queryFn: () => emergencyContactsService.getByBookingId(id!),
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

  // Mutation for updating activity status
  const updateActivityStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: DailyActivity['status'] }) => {
      const { data, error } = await supabase
        .from('daily_activities')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as DailyActivity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily_activities_by_day', id] });
    },
  });

  // Calculate stats
  const totalActivities = Object.values(dailyActivities).flat().length;
  const completedActivities = Object.values(dailyActivities).flat().filter(a => a.status === 'completed').length;
  const totalIssues = Object.values(issueReports).flat().length;
  const unresolvedIssues = Object.values(issueReports).flat().filter(issue => 
    issue.status !== 'resolved' && issue.status !== 'closed'
  ).length;
  
  // Calculate checklist stats for the selected day
  let checklistItemsCount = 0;
  let completedChecklistItems = 0;
  
  if (selectedDay) {
    const dayChecklists = checklists[selectedDay] || [];
    dayChecklists.forEach((checklist: any) => {
      checklist.checklist_items?.forEach((item: ChecklistItem) => {
        checklistItemsCount++;
        if (item.completed) completedChecklistItems++;
      });
    });
  }

  if (!id) {
    return (
      <AppLayout>
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold text-destructive">Booking ID is required</h1>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {!supabaseConfigured && <SupabaseNotice title="Supabase not configured. Data may not load." />}

        {/* Header */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-card space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-primary">Day-of Coordination</h1>
              <p className="text-muted-foreground">
                {booking?.client_name || 'Event'} • {booking?.package_type}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate(-1)}>
                Back
              </Button>
              <Button asChild>
                <Link to={`/bookings/${id}`}>
                  View Booking
                </Link>
              </Button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-muted-foreground" />
              <span>
                {eventDays.length} days • {completedActivities}/{totalActivities} activities done
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ClipboardList size={16} className="text-muted-foreground" />
              <span>
                {completedChecklistItems}/{checklistItemsCount} checklist items done
              </span>
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
                  const dayIssues = issueReports[day.id] || [];
                  const dayChecklists = checklists[day.id] || [];
                  
                  const completedActivities = dayActivities.filter(a => a.status === 'completed').length;
                  const totalDayActivities = dayActivities.length;
                  const dayUnresolvedIssues = dayIssues.filter(issue => 
                    issue.status !== 'resolved' && issue.status !== 'closed'
                  ).length;
                  
                  // Calculate checklist completion
                  let dayChecklistItems = 0;
                  let dayCompletedChecklistItems = 0;
                  dayChecklists.forEach((checklist: any) => {
                    checklist.checklist_items?.forEach((item: ChecklistItem) => {
                      dayChecklistItems++;
                      if (item.completed) dayCompletedChecklistItems++;
                    });
                  });
                  
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
                          {completedActivities}/{totalDayActivities} acts
                        </Badge>
                        {dayUnresolvedIssues > 0 && (
                          <Badge variant="destructive" className="h-5 px-2 text-xs">
                            {dayUnresolvedIssues} issues
                          </Badge>
                        )}
                        {dayChecklistItems > 0 && (
                          <Badge variant="outline" className="h-5 px-2 text-xs">
                            {dayCompletedChecklistItems}/{dayChecklistItems} list
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

        {/* Main Content */}
        {selectedDay && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activities">Activities</TabsTrigger>
              <TabsTrigger value="checklists">Checklists</TabsTrigger>
              <TabsTrigger value="issues">Issues</TabsTrigger>
              <TabsTrigger value="contacts">Contacts</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-800">
                      <Clock size={20} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Activities</p>
                      <p className="text-2xl font-bold">{dailyActivities[selectedDay]?.length || 0}</p>
                      <p className="text-xs text-muted-foreground">
                        {dailyActivities[selectedDay]?.filter(a => a.status === 'completed').length || 0} done
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100 text-green-800">
                      <ClipboardList size={20} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Checklist Items</p>
                      <p className="text-2xl font-bold">{checklistItemsCount}</p>
                      <p className="text-xs text-muted-foreground">
                        {completedChecklistItems} done
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Issues</p>
                      <p className="text-2xl font-bold">{issueReports[selectedDay]?.length || 0}</p>
                      <p className="text-xs text-muted-foreground">
                        {issueReports[selectedDay]?.filter(i => i.status !== 'resolved' && i.status !== 'closed').length || 0} pending
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-100 text-purple-800">
                      <Phone size={20} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Emergency Contacts</p>
                      <p className="text-2xl font-bold">{emergencyContacts.length}</p>
                      <p className="text-xs text-muted-foreground">
                        {emergencyContacts.filter(c => c.is_primary).length} primary
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Today's Schedule - Simplified version to avoid complex nesting */}
              <Card>
                <CardHeader>
                  <CardTitle>Today's Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const day = eventDays.find(d => d.id === selectedDay);
                    if (!day) return <div>Day not found</div>;
                    
                    const dayActivities = dailyActivities[selectedDay] || [];
                    
                    return (
                      <div className="space-y-3">
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

                        {dayActivities.length === 0 ? (
                          <div className="text-center py-4 text-muted-foreground">
                            No activities scheduled for this day
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {dayActivities
                              .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
                              .map((activity) => (
                                <div 
                                  key={activity.id} 
                                  className={`flex items-center justify-between p-3 rounded-lg border ${
                                    activity.status === 'completed' ? 'border-emerald-200 bg-emerald-50' :
                                    activity.status === 'in_progress' ? 'border-amber-200 bg-amber-50' :
                                    activity.status === 'cancelled' ? 'border-destructive/30 bg-destructive/10' :
                                    'border-border bg-background'
                                  }`}
                                >
                                  <div>
                                    <div className="font-medium text-foreground">{activity.title}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {activity.start_time?.substring(0, 5) || 'TBD'} • {activity.location || 'TBD'}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge 
                                      variant={activity.status === 'completed' ? 'default' : 
                                        activity.status === 'in_progress' ? 'secondary' : 
                                        activity.status === 'cancelled' ? 'destructive' : 'outline'}
                                    >
                                      {activity.status}
                                    </Badge>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => {
                                        const newStatus = activity.status === 'completed' ? 'pending' : 'completed';
                                        updateActivityStatus.mutate({ id: activity.id, status: newStatus });
                                      }}
                                    >
                                      {activity.status === 'completed' ? <XCircle size={14} /> : <CheckCircle size={14} />}
                                    </Button>
                                  </div>
                                </div>
                              ))
                            }
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activities" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Activities</CardTitle>
                  <Button asChild>
                    <Link to={`/bookings/${id}/activities`}>
                      <Plus size={16} className="mr-2" />
                      Add Activity
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3 mb-4">
                    <div className="flex-1 min-w-[200px]">
                      <Input
                        placeholder="Search activities..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant={filterStatus === 'all' ? 'default' : 'outline'} 
                        size="sm"
                        onClick={() => setFilterStatus('all')}
                      >
                        All
                      </Button>
                      <Button 
                        variant={filterStatus === 'pending' ? 'default' : 'outline'} 
                        size="sm"
                        onClick={() => setFilterStatus('pending')}
                      >
                        Pending
                      </Button>
                      <Button 
                        variant={filterStatus === 'in_progress' ? 'default' : 'outline'} 
                        size="sm"
                        onClick={() => setFilterStatus('in_progress')}
                      >
                        In Progress
                      </Button>
                      <Button 
                        variant={filterStatus === 'completed' ? 'default' : 'outline'} 
                        size="sm"
                        onClick={() => setFilterStatus('completed')}
                      >
                        Completed
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {(() => {
                      const dayActivities = dailyActivities[selectedDay] || [];
                      
                      // Apply search filter
                      let filteredActivities = dayActivities;
                      if (searchTerm) {
                        filteredActivities = filteredActivities.filter(activity => 
                          activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          activity.description?.toLowerCase().includes(searchTerm.toLowerCase())
                        );
                      }
                      
                      // Apply status filter
                      if (filterStatus !== 'all') {
                        filteredActivities = filteredActivities.filter(activity => activity.status === filterStatus);
                      }
                      
                      return filteredActivities.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          No activities found
                        </div>
                      ) : (
                        filteredActivities.map((activity) => (
                          <div 
                            key={activity.id} 
                            className={`flex items-center justify-between p-4 rounded-lg border ${
                              activity.status === 'completed' ? 'border-emerald-200 bg-emerald-50' :
                              activity.status === 'in_progress' ? 'border-amber-200 bg-amber-50' :
                              activity.status === 'cancelled' ? 'border-destructive/30 bg-destructive/10' :
                              'border-border bg-background'
                            }`}
                          >
                            <div>
                              <div className="font-medium text-foreground">{activity.title}</div>
                              <div className="text-sm text-muted-foreground">{activity.description}</div>
                              <div className="mt-1 flex flex-wrap gap-2 text-xs">
                                {activity.start_time && (
                                  <div className="flex items-center gap-1">
                                    <Clock size={12} />
                                    <span>{activity.start_time.substring(0, 5)}</span>
                                  </div>
                                )}
                                {activity.location && (
                                  <div className="flex items-center gap-1">
                                    <MapPin size={12} />
                                    <span>{activity.location}</span>
                                  </div>
                                )}
                                {activity.assigned_to && (
                                  <div className="flex items-center gap-1">
                                    <Users size={12} />
                                    <span>{activity.assigned_to}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={activity.status === 'completed' ? 'default' : 
                                  activity.status === 'in_progress' ? 'secondary' : 
                                  activity.status === 'cancelled' ? 'destructive' : 'outline'}
                              >
                                {activity.status}
                              </Badge>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  const newStatus = activity.status === 'completed' ? 'pending' : 'completed';
                                  updateActivityStatus.mutate({ id: activity.id, status: newStatus });
                                }}
                              >
                                {activity.status === 'completed' ? <XCircle size={14} /> : <CheckCircle size={14} />}
                              </Button>
                            </div>
                          </div>
                        ))
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="checklists" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Checklists</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const dayChecklists = checklists[selectedDay] || [];
                    
                    if (dayChecklists.length === 0) {
                      return (
                        <div className="text-center py-8 text-muted-foreground">
                          No checklists defined for this day
                        </div>
                      );
                    }
                    
                    return (
                      <div className="space-y-4">
                        {dayChecklists.map((checklist: any) => (
                          <Card key={checklist.id}>
                            <CardHeader>
                              <CardTitle className="text-base">{checklist.name}</CardTitle>
                              {checklist.description && (
                                <p className="text-sm text-muted-foreground">{checklist.description}</p>
                              )}
                            </CardHeader>
                            <CardContent>
                              {checklist.checklist_items && checklist.checklist_items.length > 0 ? (
                                <div className="space-y-2">
                                  {checklist.checklist_items.map((item: ChecklistItem) => (
                                    <div 
                                      key={item.id} 
                                      className={`flex items-center justify-between p-3 rounded-lg border ${
                                        item.completed ? 'border-emerald-200 bg-emerald-50' : 'border-border bg-background'
                                      }`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <span className={item.completed ? "line-through text-muted-foreground" : ""}>
                                          {item.item_text}
                                        </span>
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {item.due_time && `Due: ${item.due_time.substring(0, 5)}`}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-4 text-muted-foreground">
                                  No items in this checklist
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="issues" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Issues & Problems</CardTitle>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      // In a real implementation, you would open a modal or navigate to create an issue
                      alert('Issue creation form would open here');
                    }}
                  >
                    <Plus size={16} className="mr-2" />
                    Report Issue
                  </Button>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const dayIssues = issueReports[selectedDay] || [];
                    
                    if (dayIssues.length === 0) {
                      return (
                        <div className="text-center py-8 text-muted-foreground">
                          No issues reported for this day
                        </div>
                      );
                    }
                    
                    return (
                      <div className="space-y-4">
                        {dayIssues.map((issue) => (
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
                                  <Users size={12} className="text-muted-foreground" />
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
                        ))}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contacts" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Emergency Contacts</CardTitle>
                </CardHeader>
                <CardContent>
                  {emergencyContacts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No emergency contacts defined for this booking
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {emergencyContacts.map((contact) => (
                        <div 
                          key={contact.id} 
                          className={`rounded-lg border p-4 ${
                            contact.is_primary ? 'border-primary bg-primary/5' : 'border-border'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold text-foreground flex items-center gap-2">
                                {contact.is_primary && <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Primary</span>}
                                {contact.contacts?.name || 'Contact Name'}
                              </h3>
                              <p className="text-sm text-muted-foreground">{contact.contact_type}</p>
                            </div>
                            <div className="flex gap-2">
                              {contact.contacts?.phone && (
                                <Button size="sm" variant="outline" asChild>
                                  <a href={`tel:${contact.contacts.phone}`}>
                                    <Phone size={14} className="mr-1" />
                                    Call
                                  </a>
                                </Button>
                              )}
                              {contact.contacts?.email && (
                                <Button size="sm" variant="outline" asChild>
                                  <a href={`mailto:${contact.contacts.email}`}>
                                    <Mail size={14} className="mr-1" />
                                    Email
                                  </a>
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            Available: {contact.availability_hours || 'Not specified'}
                            {contact.notes && <div className="mt-1">Notes: {contact.notes}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
};

export default DayOfCoordination;