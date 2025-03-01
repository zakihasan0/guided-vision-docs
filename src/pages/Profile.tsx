import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Clock, Film, Settings, User2 } from "lucide-react";

const Profile = () => {
  return (
    <div className="container py-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">My Profile</h1>
        
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <User2 className="h-5 w-5 text-primary" />
                Account
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground">Name</div>
                  <div className="text-base font-medium">John Doe</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Email</div>
                  <div className="text-base font-medium">john.doe@example.com</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Member Since</div>
                  <div className="text-base font-medium">October 2023</div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" className="w-full">
                <Settings className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground">Current Plan</div>
                  <div className="text-base font-medium">Pro Plan</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Videos Used</div>
                  <div className="text-base font-medium">15 / 25</div>
                  <div className="w-full h-2 bg-primary/10 rounded-full mt-2">
                    <div className="h-full bg-primary rounded-full" style={{ width: '60%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Billing Period</div>
                  <div className="text-base font-medium">Nov 1 - Nov 30, 2023</div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" className="w-full">
                <Film className="h-4 w-4 mr-2" />
                View Usage History
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-b pb-2">
                  <div className="text-sm font-medium">Created Documentation</div>
                  <div className="text-xs text-muted-foreground">Today at 2:30 PM</div>
                </div>
                <div className="border-b pb-2">
                  <div className="text-sm font-medium">Updated Profile Settings</div>
                  <div className="text-xs text-muted-foreground">Yesterday at 10:15 AM</div>
                </div>
                <div className="border-b pb-2">
                  <div className="text-sm font-medium">Shared Documentation</div>
                  <div className="text-xs text-muted-foreground">Nov 10, 2023 at 4:45 PM</div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" className="w-full">
                View All Activity
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        <div className="mt-10 border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Need Help?</h2>
          <p className="text-muted-foreground mb-6">
            Have questions about your account or how to use How2? Our support team is here to help.
          </p>
          <div className="flex gap-4">
            <Button>Contact Support</Button>
            <Button variant="outline">Visit Help Center</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile; 