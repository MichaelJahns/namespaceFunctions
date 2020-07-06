export interface User {
    email: string;
    password: string;
}

export interface NewUser {
    // Required
    email: string;
    password: string;
    confirmPassword: string;
    displayName: string;
}

// There can be all or none of these expected NewUserErrors
export interface UserErrors {
    email?: string;
    displayName?: string;
    password?: string;
    confirmPassword?: string;
}