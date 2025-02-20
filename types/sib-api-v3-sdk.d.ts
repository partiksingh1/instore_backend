declare module 'sib-api-v3-sdk' {
  namespace brevo {
    export class ApiKeyAuth {
      apiKey: string;
    }

    export class TransactionalEmailsApi {
      authentications: {
        apiKey: ApiKeyAuth;
      };
      sendTransacEmail: (sendSmtpEmail: SendSmtpEmail) => Promise<any>;
    }

    export class SendSmtpEmail {
      sender: { email: string };
      to: { email: string }[];
      subject: string;
      htmlContent: string;
    }
  }

  // Export the brevo namespace
  export = brevo;
}
