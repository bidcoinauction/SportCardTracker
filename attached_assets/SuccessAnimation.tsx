import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckIcon } from 'lucide-react';

interface SuccessAnimationProps {
  message: string;
  redirectTo?: string;
}

// Generate random positions for falling balls
const generateBalls = (count: number) => {
  return Array.from({ length: count }).map((_, i) => ({
    id: i,
    x: Math.random() * 100, // random x position as percentage of container width
    size: Math.random() * 20 + 10, // random size between 10-30px
    delay: Math.random() * 0.5, // random delay for animation start
    duration: Math.random() * 1 + 1, // random duration between 1-2s
  }));
};

const SuccessAnimation: React.FC<SuccessAnimationProps> = ({ message, redirectTo = '/' }) => {
  const [visible, setVisible] = useState(true);
  const balls = generateBalls(15); // Create 15 soccer balls
  
  useEffect(() => {
    // Redirect after animation finishes
    const timer = setTimeout(() => {
      setVisible(false);
      window.location.href = redirectTo;
    }, 2500);
    
    return () => clearTimeout(timer);
  }, [redirectTo]);
  
  // Don't render anything if not visible
  if (!visible) return null;
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-60">
      <div className="relative overflow-hidden w-full h-full">
        {/* Falling soccer balls */}
        {balls.map((ball) => (
          <motion.div
            key={ball.id}
            className="absolute"
            style={{ 
              left: `${ball.x}%`,
              top: '-50px', // Start above the viewport
              width: `${ball.size}px`,
              height: `${ball.size}px`,
            }}
            initial={{ y: -100 }}
            animate={{ y: window.innerHeight + 100 }} // Move down past the bottom of the screen
            transition={{
              duration: ball.duration,
              delay: ball.delay,
              ease: 'easeIn',
            }}
          >
            <div className="w-full h-full rounded-full bg-white relative">
              {/* Soccer ball pattern */}
              <div className="absolute inset-0 rounded-full border-2 border-gray-800" />
              <div 
                className="absolute bg-gray-800" 
                style={{ 
                  width: '40%', 
                  height: '40%', 
                  top: '30%', 
                  left: '30%',
                  borderRadius: '20%' 
                }}
              />
              <div 
                className="absolute bg-gray-800" 
                style={{ 
                  width: '20%', 
                  height: '20%', 
                  top: '10%', 
                  left: '50%',
                  borderRadius: '50%' 
                }}
              />
              <div 
                className="absolute bg-gray-800" 
                style={{ 
                  width: '20%', 
                  height: '20%', 
                  top: '70%', 
                  left: '20%',
                  borderRadius: '50%' 
                }}
              />
            </div>
          </motion.div>
        ))}
        
        {/* Success message */}
        <motion.div 
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl p-6 shadow-xl flex flex-col items-center max-w-md w-11/12"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div 
            className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
          >
            <CheckIcon className="w-10 h-10 text-green-600" />
          </motion.div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Success!</h2>
          <p className="text-gray-600 text-center">{message}</p>
        </motion.div>
      </div>
    </div>
  );
};

export default SuccessAnimation;