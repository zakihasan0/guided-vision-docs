import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const PricingTier = ({
  title,
  price,
  description,
  features,
  buttonText,
  highlighted = false
}: {
  title: string;
  price: string;
  description: string;
  features: string[];
  buttonText: string;
  highlighted?: boolean;
}) => (
  <div className={`rounded-lg border ${highlighted ? 'border-primary shadow-lg' : 'border-border'} p-6 flex flex-col h-full`}>
    <div className="mb-4">
      <h3 className="text-lg font-medium">{title}</h3>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-bold">{price}</span>
        {price !== 'Free' && <span className="text-muted-foreground">/month</span>}
      </div>
      <p className="mt-2 text-muted-foreground">{description}</p>
    </div>
    
    <div className="mt-4 space-y-3 flex-grow">
      {features.map((feature, index) => (
        <div key={index} className="flex gap-2 items-start">
          <Check className="h-5 w-5 text-primary flex-shrink-0" />
          <span>{feature}</span>
        </div>
      ))}
    </div>
    
    <div className="mt-6">
      <Button 
        className="w-full" 
        variant={highlighted ? "default" : "outline"}
      >
        {buttonText}
      </Button>
    </div>
  </div>
);

const Pricing = () => {
  return (
    <div className="container py-10">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-muted-foreground">
            Choose the plan that's right for you and start creating amazing documentation
          </p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-3">
          <PricingTier
            title="Free"
            price="Free"
            description="Perfect for trying out How2"
            features={[
              "3 videos per month",
              "Basic documentation generation",
              "Public link sharing",
              "7-day history"
            ]}
            buttonText="Get Started"
          />
          
          <PricingTier
            title="Pro"
            price="$19"
            description="For professionals and small teams"
            features={[
              "25 videos per month",
              "Advanced documentation formatting",
              "Team sharing capabilities",
              "30-day history",
              "Priority support"
            ]}
            buttonText="Upgrade to Pro"
            highlighted={true}
          />
          
          <PricingTier
            title="Enterprise"
            price="$49"
            description="For larger teams and organizations"
            features={[
              "Unlimited videos",
              "Custom branding options",
              "Advanced team management",
              "Unlimited history",
              "API access",
              "Dedicated support"
            ]}
            buttonText="Contact Sales"
          />
        </div>
        
        <div className="mt-16 text-center">
          <h3 className="text-xl font-medium mb-4">Need a custom solution?</h3>
          <p className="text-muted-foreground mb-6">
            Contact us for custom pricing and feature requirements for your organization.
          </p>
          <Button variant="outline" size="lg">
            Contact Sales Team
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Pricing; 