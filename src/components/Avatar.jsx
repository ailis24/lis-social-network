export default function Avatar({ src, username, size = 'md', onClick }) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-20 h-20',
    xl: 'w-32 h-32'
  };

  return (
    <div 
      onClick={onClick}
      className={`${sizes[size]} rounded-full overflow-hidden border-2 border-purple-500 cursor-pointer flex-shrink-0`}
    >
      <img 
        src={src || '/fox.gif'} 
        alt={username} 
        className="w-full h-full object-cover" 
      />
    </div>
  );
}