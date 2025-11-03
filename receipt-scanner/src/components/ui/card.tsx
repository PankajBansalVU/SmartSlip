export const Card = (props: any) => {
    return <div className="card" {...props}>{props.children}</div>;
  };
  
  export const CardContent = (props: any) => {
    return <div className="card-content" {...props}>{props.children}</div>;
  };
  
  export const CardDescription = (props: any) => {
    return <p className="card-description" {...props}>{props.children}</p>;
  };
  
  export const CardHeader = (props: any) => {
    return <div className="card-header" {...props}>{props.children}</div>;
  };
  
  export const CardTitle = (props: any) => {
    return <h2 className="card-title" {...props}>{props.children}</h2>;
  };
  export const CardFooter = (props: any) => {
    return <div className="card-footer" {...props}>{props.children}</div>;
  };
  