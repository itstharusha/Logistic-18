import React from 'react';

// Generates a background color based on string hash
const stringToColor = (string) => {
  let hash = 0;
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  return color;
};

// Formats the user initials
const getInitials = (name) => {
  if (!name) return 'U';
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

export default function UserAvatar({ user, size = '40px' }) {
  const isOnline = user.lastActiveAt ? (new Date() - new Date(user.lastActiveAt)) < 15 * 60 * 1000 : false;
  
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div 
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: stringToColor(user.name || 'User'),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '14px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
        title={`${user.name} - ${isOnline ? 'Online' : 'Offline'}`}
      >
        {getInitials(user.name)}
      </div>
      <div 
        style={{
          position: 'absolute',
          bottom: 2,
          right: 2,
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: isOnline ? '#10b981' : '#9ca3af',
          border: '2px solid white'
        }} 
      />
    </div>
  );
}