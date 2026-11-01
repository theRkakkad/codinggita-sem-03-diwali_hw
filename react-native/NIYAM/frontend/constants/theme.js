// Central theme aggregator for NIYAM.
import Colors from './colors';
import Typography from './typography';
import Spacing from './spacing';
import Radius from './radius';

export const Theme = {
  colors: Colors,
  typography: Typography,
  spacing: Spacing,
  radius: Radius,

  // Subtle dark-mode shadows
  shadows: {
    card: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 2,
    },
    elevated: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 4,
    },
  },
};

export { Colors, Typography, Spacing, Radius };
export default Theme;
