import React, { useEffect, useState } from "react";
import { CheckCircle } from "lucide-react";
import { useLocation } from "wouter";

interface SuccessAnimationProps {
  message: string;
  redirectTo?: string;
}

export default function SuccessAnimation({ message, redirectTo }: SuccessAnimationProps) {
  const [, navigate] = useLocation();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (redirectTo) {
      const timer = setTimeout(() => {
        if (countdown > 1) {
          setCountdown(countdown - 1);
        } else {
          navigate(redirectTo);
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [countdown, navigate, redirectTo]);

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="bg-green-100 text-green-800 rounded-full p-4 mb-4">
        <CheckCircle size={48} className="text-green-600" />
      </div>
      
      <h3 className="text-xl font-medium text-center mb-2">{message}</h3>
      
      {redirectTo && (
        <p className="text-gray-500 text-center">
          Redirecting in {countdown} seconds...
        </p>
      )}
    </div>
  );
}