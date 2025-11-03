export const Alert = (props: any) => {
    return <div className="alert" {...props}>{props.children}</div>;
  };
  
  export const AlertDescription = (props: any) => {
    return <div className="alert-description" {...props}>{props.children}</div>;
  };
  