export const DropdownMenu = (props: any) => {
    return <div className="dropdown-menu" {...props}>{props.children}</div>;
  };
  
  export const DropdownMenuContent = (props: any) => {
    return <div className="dropdown-menu-content" {...props}>{props.children}</div>;
  };
  
  export const DropdownMenuItem = (props: any) => {
    return <div className="dropdown-menu-item" {...props}>{props.children}</div>;
  };
  
  export const DropdownMenuSeparator = (props: any) => {
    return <hr className="dropdown-menu-separator" {...props} />;
  };
  
  export const DropdownMenuTrigger = (props: any) => {
    return <div className="dropdown-menu-trigger" {...props}>{props.children}</div>;
  };
  
  