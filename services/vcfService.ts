import { User } from '../types';

export const VcfService = {
  generateVCardString: (user: User): string => {
    // VCard 3.0 is the gold standard for cross-platform compatibility
    return [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${user.name}`,
      `N:${user.name};;;;`,
      `TEL;TYPE=CELL:${user.phone}`,
      'ORG:Λ𝗫𝗜𝗦 Ł𝗮𝗯𝘀',
      'NOTE:Collected via AXIS Platform',
      'END:VCARD'
    ].join('\r\n');
  },

  generateFileContent: (users: User[]): string => {
    return users.map(user => VcfService.generateVCardString(user)).join('\r\n');
  },

  downloadBlob: (content: string, filename: string) => {
    try {
      const blob = new Blob([content], { type: 'text/vcard;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error('VCF Download Failed:', error);
    }
  }
};