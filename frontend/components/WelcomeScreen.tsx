'use client';

interface WelcomeScreenProps {
  onSuggestionClick: (suggestion: string) => void;
}

export default function WelcomeScreen({ onSuggestionClick }: WelcomeScreenProps) {
  const suggestions = [
    {
      icon: '🎬',
      title: 'Trending Ideas',
      description: 'Get the latest viral content ideas',
      prompt: 'Show me trending TikTok video ideas',
    },
    {
      icon: '💡',
      title: 'Content Tips',
      description: 'Learn how to create viral content',
      prompt: 'Give me tips for viral content',
    },
    {
      icon: '📈',
      title: 'Growth Strategies',
      description: 'Boost your follower count',
      prompt: 'How can I grow my TikTok following?',
    },
    {
      icon: '🎵',
      title: 'Trending Sounds',
      description: 'Find the hottest audio trends',
      prompt: 'What are the trending sounds on TikTok?',
    },
  ];

  const features = [
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: 'Real-time Trends',
      description: 'Stay updated with the latest TikTok trends',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      title: 'Creative Ideas',
      description: 'Get personalized content suggestions',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      title: 'Analytics Insights',
      description: 'Understand what works best',
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-12">
      <div className="max-w-3xl w-full">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-6 shadow-2xl">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to TikTok Assistant
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Your AI-powered companion for creating viral TikTok content. Get trending ideas, 
            learn best practices, and grow your audience faster than ever.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow duration-300"
            >
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 mb-4">
                {feature.icon}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Suggestions */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 text-center">
            Start with a suggestion
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => onSuggestionClick(suggestion.prompt)}
                className="text-left p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-gray-100 transition-all duration-200 group"
              >
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">{suggestion.icon}</span>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
                      {suggestion.title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {suggestion.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}